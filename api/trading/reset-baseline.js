/**
 * POST /api/trading/reset-baseline
 * Resets the P&L baseline (initial capital) to the current live portfolio
 * value, so all P&L/target calculations reflect current performance
 * instead of a stale or hardcoded starting balance.
 */

const { createCoinbaseClient } = require('../../lib/coinbase/client');
const { setInitialCapital } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const coinbase = createCoinbaseClient();
    const portfolio = await coinbase.getPortfolio();
    const totalValue = portfolio.reduce((sum, acc) => sum + acc.value_usd, 0);

    const settings = await setInitialCapital(totalValue);

    return res.status(200).json({
      success: true,
      initialCapital: parseFloat(settings.initial_capital),
      message: `Baseline reset to $${totalValue.toFixed(2)}`
    });
  } catch (error) {
    console.error('Reset baseline error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
