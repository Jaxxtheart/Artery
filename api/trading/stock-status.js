/**
 * GET /api/trading/stock-status
 * Stock trading dashboard data: Alpaca account, live positions, recent
 * paper trades, market clock, and latest signals.
 */

const { createAlpacaClient, isAlpacaConfigured } = require('../../lib/alpaca/client');
const { supabase } = require('../../lib/supabase');
const { STOCK_SYMBOLS } = require('../../lib/trading/stock-strategies');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!isAlpacaConfigured()) {
      return res.status(200).json({
        success: true,
        configured: false,
        watchlist: STOCK_SYMBOLS,
        message: 'Alpaca not configured. Create a free paper account at alpaca.markets, then set ALPACA_API_KEY and ALPACA_API_SECRET.'
      });
    }

    const alpaca = createAlpacaClient();

    const [account, clock, alpacaPositions] = await Promise.all([
      alpaca.getAccount(),
      alpaca.getClock(),
      alpaca.getPositions()
    ]);

    let recentTrades = [];
    let recentSignals = [];
    if (supabase) {
      const [tradeRes, signalRes] = await Promise.all([
        supabase.from('stock_trade_history').select('*').order('exit_time', { ascending: false }).limit(10),
        supabase.from('stock_signals').select('*').order('created_at', { ascending: false }).limit(16)
      ]);
      recentTrades = tradeRes.data || [];
      recentSignals = signalRes.data || [];
    }

    return res.status(200).json({
      success: true,
      configured: true,
      paper: alpaca.paper,
      account: {
        equity: parseFloat(account.equity),
        cash: parseFloat(account.cash),
        buyingPower: parseFloat(account.buying_power),
        currency: account.currency
      },
      market: {
        isOpen: clock.is_open,
        nextOpen: clock.next_open,
        nextClose: clock.next_close
      },
      positions: alpacaPositions.map(p => ({
        symbol: p.symbol,
        qty: parseFloat(p.qty),
        entryPrice: parseFloat(p.avg_entry_price),
        currentPrice: parseFloat(p.current_price),
        marketValue: parseFloat(p.market_value),
        pnlUsd: parseFloat(p.unrealized_pl),
        pnlPct: parseFloat(p.unrealized_plpc) * 100
      })),
      recentTrades,
      recentSignals,
      watchlist: STOCK_SYMBOLS,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stock status error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
