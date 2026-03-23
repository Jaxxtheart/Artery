/**
 * GET /api/trading/status
 * Returns current portfolio status: positions, P&L, portfolio snapshot
 */

const { supabase } = require('../../lib/supabase');
const { createCoinbaseClient } = require('../../lib/coinbase/client');
const { calculateRiskMetrics } = require('../../lib/trading/risk-manager');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let openPositions = [];
    let recentTrades = [];
    let strategyPerformance = [];
    let allSnapshots = [];
    let latestSnapshot = null;

    if (supabase) {
      const [posRes, tradeRes, stratRes, snapRes] = await Promise.all([
        supabase.from('positions').select('*').eq('status', 'OPEN').order('entry_time', { ascending: false }),
        supabase.from('trade_history').select('*').order('exit_time', { ascending: false }).limit(20),
        supabase.from('strategy_performance').select('*').order('total_trades', { ascending: false }),
        supabase.from('portfolio_snapshots').select('*').order('snapshot_date', { ascending: false }).limit(30)
      ]);

      openPositions = posRes.data || [];
      recentTrades = tradeRes.data || [];
      strategyPerformance = stratRes.data || [];
      allSnapshots = snapRes.data || [];
      latestSnapshot = allSnapshots[0] || null;
    }

    // Try to get live portfolio value
    let livePortfolio = null;
    let totalValue = latestSnapshot?.total_value || 0;
    try {
      const coinbase = createCoinbaseClient();
      const portfolio = await coinbase.getPortfolio();
      totalValue = portfolio.reduce((sum, acc) => sum + acc.value_usd, 0);
      livePortfolio = portfolio;
    } catch {
      // Use snapshot value if live fetch fails
    }

    // Update P&L for open positions with live prices
    if (livePortfolio && openPositions.length > 0) {
      const priceMap = {};
      livePortfolio.forEach(acc => {
        if (acc.type === 'crypto') priceMap[`${acc.currency}-USD`] = acc.price;
      });

      openPositions = openPositions.map(pos => {
        const currentPrice = priceMap[pos.symbol];
        if (currentPrice) {
          const pnlUsd = (currentPrice - pos.entry_price) * pos.size;
          const pnlPct = ((currentPrice - pos.entry_price) / pos.entry_price) * 100;
          return { ...pos, current_price: currentPrice, pnl_usd: pnlUsd, pnl_pct: pnlPct };
        }
        return pos;
      });
    }

    const riskMetrics = calculateRiskMetrics(openPositions, totalValue);
    const initialCapital = parseFloat(process.env.INITIAL_CAPITAL || '1441');
    const totalPnL = totalValue - initialCapital;
    const totalPnLPct = (totalPnL / initialCapital) * 100;

    return res.status(200).json({
      success: true,
      portfolio: {
        totalValue,
        initialCapital,
        totalPnL,
        totalPnLPct,
        liveAssets: livePortfolio
      },
      openPositions,
      recentTrades,
      strategyPerformance,
      snapshots: allSnapshots,
      riskMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Status error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
