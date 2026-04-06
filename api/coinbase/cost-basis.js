/**
 * GET /api/coinbase/cost-basis
 *
 * Source priority per coin:
 *   1. Manual entry in Supabase (user override)
 *   2. Coinbase portfolio breakdown API (cost_basis + unrealized_pnl)
 *   3. Coinbase fills history (Advanced Trade orders only)
 *   4. N/A
 */

const { createCoinbaseClient } = require('../../lib/coinbase/client');
const { supabase } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const coinbase = createCoinbaseClient();

    // Fetch all sources in parallel
    const [portfolio, portfoliosData, fillsData, manualData] = await Promise.all([
      coinbase.getPortfolio(),
      coinbase.getPortfolios().catch(() => ({ portfolios: [] })),
      coinbase.getFills().catch(() => ({ fills: [] })),
      supabase
        ? supabase.from('holdings_cost_basis').select('*').then(r => r.data || [])
        : Promise.resolve([]),
    ]);

    // ── Source 1: Manual Supabase entries ──────────────────────────────────
    const manualMap = {};
    for (const row of manualData) {
      manualMap[row.currency.toUpperCase()] = parseFloat(row.total_spent);
    }

    // ── Source 2: Portfolio breakdown (cost_basis per spot position) ───────
    const breakdownMap = {};
    try {
      const portfolios = portfoliosData?.portfolios || [];
      // Use first non-DEFAULT portfolio, or DEFAULT if that's all there is
      const target = portfolios.find(p => p.type !== 'DEFAULT') || portfolios[0];
      if (target?.uuid) {
        const bd = await coinbase.getPortfolioBreakdown(target.uuid);
        const positions = bd?.breakdown?.spot_positions || [];
        for (const pos of positions) {
          const currency = pos.asset;
          if (!currency) continue;
          // cost_basis is total USD spent; unrealized_pnl is already computed
          const totalCost   = parseFloat(pos.cost_basis?.value    ?? pos.cost_basis    ?? 0);
          const unrealisedPnl = parseFloat(pos.unrealized_pnl?.value ?? pos.unrealized_pnl ?? 0);
          if (totalCost > 0) breakdownMap[currency] = { totalCost, unrealisedPnl };
        }
      }
    } catch {
      // Non-fatal — fall through to fills
    }

    // ── Source 3: Fills-based weighted average ─────────────────────────────
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

    // ── Build per-holding result ───────────────────────────────────────────
    const holdings = portfolio
      .filter(a => a.type === 'crypto' && a.balance > 0.000001)
      .map(a => {
        const { currency, balance = 0, price: currentPrice = 0, value_usd: currentValue = 0 } = a;

        let totalCost = null;
        let unrealisedPnl = null;
        let source = null;

        if (manualMap[currency] != null) {
          totalCost     = manualMap[currency];
          unrealisedPnl = currentValue - totalCost;
          source        = 'manual';
        } else if (breakdownMap[currency]) {
          totalCost     = breakdownMap[currency].totalCost;
          unrealisedPnl = breakdownMap[currency].unrealisedPnl || (currentValue - totalCost);
          source        = 'coinbase';
        } else if (fillsMap[currency]?.totalUnits > 0) {
          totalCost     = fillsMap[currency].totalSpent;
          unrealisedPnl = currentValue - totalCost;
          source        = 'fills';
        }

        if (totalCost === null) {
          return { currency, balance, currentPrice, currentValue, costBasis: null, totalCost: null, unrealisedPnl: null, unrealisedPnlPct: null, breakEvenPrice: null, source: null };
        }

        const costBasis        = totalCost / balance;
        const unrealisedPnlPct = (unrealisedPnl / totalCost) * 100;
        const breakEvenPrice   = totalCost / balance;

        return { currency, balance, currentPrice, currentValue, costBasis, totalCost, unrealisedPnl, unrealisedPnlPct, breakEvenPrice, source };
      });

    const totalCurrentValue  = holdings.reduce((s, h) => s + h.currentValue, 0);
    const knownHoldings      = holdings.filter(h => h.totalCost !== null);
    const totalCost          = knownHoldings.reduce((s, h) => s + h.totalCost, 0);
    const totalUnrealisedPnl = knownHoldings.reduce((s, h) => s + h.unrealisedPnl, 0);
    const hasAnyCostBasis    = knownHoldings.length > 0;

    return res.status(200).json({
      success: true,
      holdings,
      summary: {
        totalCurrentValue,
        totalCost:          hasAnyCostBasis ? totalCost : null,
        totalUnrealisedPnl: hasAnyCostBasis ? totalUnrealisedPnl : null,
        totalUnrealisedPnlPct: hasAnyCostBasis && totalCost > 0
          ? (totalUnrealisedPnl / totalCost) * 100 : null,
      },
    });
  } catch (error) {
    console.error('Cost basis error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
