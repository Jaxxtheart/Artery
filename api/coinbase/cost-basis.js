/**
 * GET /api/coinbase/cost-basis
 * Returns per-coin: costBasis, totalSpent, unrealisedPnL, breakEvenPrice.
 *
 * Source priority:
 *   1. Manual entries stored in Supabase (holdings_cost_basis table)
 *   2. Coinbase fills history (only covers Advanced Trade orders)
 *   3. N/A — user must enter manually
 */

const { createCoinbaseClient } = require('../../lib/coinbase/client');
const { supabase } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const coinbase = createCoinbaseClient();

    // Fetch portfolio, fills, and manual Supabase entries in parallel
    const [portfolio, fillsData, manualData] = await Promise.all([
      coinbase.getPortfolio(),
      coinbase.getFills().catch(() => ({ fills: [] })),
      supabase
        ? supabase.from('holdings_cost_basis').select('*').then(r => r.data || [])
        : Promise.resolve([]),
    ]);

    // Build manual cost map from Supabase  { currency -> total_spent }
    const manualMap = {};
    for (const row of manualData) {
      manualMap[row.currency.toUpperCase()] = parseFloat(row.total_spent);
    }

    // Build fills-based cost map  { currency -> { totalSpent, totalUnits } }
    const fillsMap = {};
    for (const fill of (fillsData?.fills || [])) {
      if (fill.side?.toUpperCase() !== 'BUY') continue;
      const currency = fill.product_id?.replace('-USD', '');
      if (!currency) continue;
      const price = parseFloat(fill.price || 0);
      const size  = parseFloat(fill.size  || 0);
      if (!price || !size) continue;
      if (!fillsMap[currency]) fillsMap[currency] = { totalSpent: 0, totalUnits: 0 };
      fillsMap[currency].totalSpent += price * size;
      fillsMap[currency].totalUnits += size;
    }

    const holdings = portfolio
      .filter(a => a.type === 'crypto' && a.balance > 0.000001)
      .map(a => {
        const currency     = a.currency;
        const balance      = a.balance || 0;
        const currentPrice = a.price   || 0;
        const currentValue = a.value_usd || 0;

        // Priority 1: manual Supabase entry
        let totalCost = null;
        let source    = null;

        if (manualMap[currency] != null) {
          totalCost = manualMap[currency];
          source    = 'manual';
        } else if (fillsMap[currency]?.totalUnits > 0) {
          totalCost = fillsMap[currency].totalSpent;
          source    = 'fills';
        }

        if (totalCost === null) {
          return { currency, balance, currentPrice, currentValue, costBasis: null, totalCost: null, unrealisedPnl: null, unrealisedPnlPct: null, breakEvenPrice: null, source: null };
        }

        const costBasis        = totalCost / balance;
        const unrealisedPnl    = currentValue - totalCost;
        const unrealisedPnlPct = (unrealisedPnl / totalCost) * 100;
        const breakEvenPrice   = totalCost / balance;

        return { currency, balance, currentPrice, currentValue, costBasis, totalCost, unrealisedPnl, unrealisedPnlPct, breakEvenPrice, source };
      });

    const totalCurrentValue  = holdings.reduce((s, h) => s + h.currentValue, 0);
    const totalCost          = holdings.reduce((s, h) => s + (h.totalCost ?? h.currentValue), 0);
    const totalUnrealisedPnl = holdings
      .filter(h => h.unrealisedPnl !== null)
      .reduce((s, h) => s + h.unrealisedPnl, 0);
    const hasAnyCostBasis    = holdings.some(h => h.totalCost !== null);

    return res.status(200).json({
      success: true,
      holdings,
      summary: {
        totalCurrentValue,
        totalCost: hasAnyCostBasis ? totalCost : null,
        totalUnrealisedPnl: hasAnyCostBasis ? totalUnrealisedPnl : null,
        totalUnrealisedPnlPct: hasAnyCostBasis && totalCost > 0 ? (totalUnrealisedPnl / totalCost) * 100 : null,
      },
    });
  } catch (error) {
    console.error('Cost basis error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
