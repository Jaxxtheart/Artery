/**
 * POST /api/email/daily-report
 * Manually trigger the daily email report
 */

const { sendDailyTradingReport } = require('../../lib/trading-email-templates');
const { supabase } = require('../../lib/supabase');
const { createCoinbaseClient } = require('../../lib/coinbase/client');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = req.headers.authorization;
  const queryKey = req.query && req.query.key;
  const validBearer = auth === `Bearer ${process.env.CRON_SECRET}` || auth === `Bearer ${process.env.ADMIN_PASSWORD}`;
  const validQuery = queryKey === process.env.CRON_SECRET || queryKey === process.env.ADMIN_PASSWORD;
  if (!validBearer && !validQuery) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let totalValue = 0;
    let cashBalance = 0;

    try {
      const coinbase = createCoinbaseClient();
      const portfolio = await coinbase.getPortfolio();
      totalValue = portfolio.reduce((s, a) => s + a.value_usd, 0);
      cashBalance = portfolio.filter(a => a.type === 'cash').reduce((s, a) => s + a.value_usd, 0);
    } catch (err) {
      console.warn('Could not fetch live portfolio:', err.message);
    }

    let signals = [];
    let executedTrades = [];

    if (supabase) {
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySignals } = await supabase
        .from('signals')
        .select('*')
        .gte('created_at', today)
        .order('confidence', { ascending: false });
      signals = todaySignals || [];

      const { data: todayTrades } = await supabase
        .from('signals')
        .select('*')
        .gte('created_at', today)
        .eq('executed', true);
      executedTrades = todayTrades || [];
    }

    await sendDailyTradingReport({
      portfolio: { totalValue, cashBalance },
      signals,
      executedTrades,
      closedPositions: 0,
      log: []
    });

    return res.status(200).json({ success: true, message: 'Report sent successfully' });
  } catch (error) {
    console.error('Email report error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
