/**
 * GET /api/coinbase/cost-basis
 * Calculates weighted average cost basis for each held coin using fill history.
 * Returns per-coin: costBasis, totalSpent, totalUnits, unrealisedPnL, breakEvenPrice.
 */

const { createCoinbaseClient } = require('../../lib/coinbase/client');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const coinbase = createCoinbaseClient();

    // Fetch current holdings and all fills in parallel
    const [portfolio, fillsData] = await Promise.all([
      coinbase.getPortfolio(),
      coinbase.getFills(),
    ]);

    const fills = fillsData?.fills || [];

    // Build weighted-average cost basis per coin from BUY fills
    // costMap[currency] = { totalSpent, totalUnits }
    const costMap = {};
    for (const fill of fills) {
      const side = fill.side?.toUpperCase();
      if (side !== 'BUY') continue;

      const currency = fill.product_id?.replace('-USD', '');
      if (!currency) continue;

      const price = parseFloat(fill.price || 0);
      const size  = parseFloat(fill.size  || 0);
      if (!price || !size) continue;

      if (!costMap[currency]) costMap[currency] = { totalSpent: 0, totalUnits: 0 };
      costMap[currency].totalSpent += price * size;
      costMap[currency].totalUnits += size;
    }

    // Build analysis for each held crypto asset
    const holdings = portfolio
      .filter(a => a.type === 'crypto' && a.balance > 0.000001)
      .map(a => {
        const cm = costMap[a.currency];
        const currentValue = a.value_usd || 0;
        const currentPrice = a.price || 0;
        const balance = a.balance || 0;

        if (!cm || cm.totalUnits === 0) {
          return {
            currency: a.currency,
            balance,
            currentPrice,
            currentValue,
            costBasis: null,
            totalCost: null,
            unrealisedPnl: null,
            unrealisedPnlPct: null,
            breakEvenPrice: null,
          };
        }

        const costBasis    = cm.totalSpent / cm.totalUnits; // avg price per unit
        const totalCost    = costBasis * balance;
        const unrealisedPnl    = currentValue - totalCost;
        const unrealisedPnlPct = (unrealisedPnl / totalCost) * 100;
        const breakEvenPrice   = totalCost / balance;

        return {
          currency: a.currency,
          balance,
          currentPrice,
          currentValue,
          costBasis,
          totalCost,
          unrealisedPnl,
          unrealisedPnlPct,
          breakEvenPrice,
        };
      });

    const totalCurrentValue  = holdings.reduce((s, h) => s + h.currentValue, 0);
    const totalCost          = holdings.reduce((s, h) => s + (h.totalCost || h.currentValue), 0);
    const totalUnrealisedPnl = totalCurrentValue - totalCost;

    return res.status(200).json({
      success: true,
      holdings,
      summary: {
        totalCurrentValue,
        totalCost,
        totalUnrealisedPnl,
        totalUnrealisedPnlPct: totalCost > 0 ? (totalUnrealisedPnl / totalCost) * 100 : 0,
      },
    });
  } catch (error) {
    console.error('Cost basis error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
