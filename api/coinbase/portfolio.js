/**
 * GET /api/coinbase/portfolio
 * Fetch live portfolio data from Coinbase
 */

const { createCoinbaseClient } = require('../../lib/coinbase/client');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const coinbase = createCoinbaseClient();
    const portfolio = await coinbase.getPortfolio();

    const totalValue = portfolio.reduce((sum, acc) => sum + acc.value_usd, 0);
    const cashBalance = portfolio
      .filter(acc => acc.type === 'cash')
      .reduce((sum, acc) => sum + acc.value_usd, 0);
    const cryptoValue = portfolio
      .filter(acc => acc.type === 'crypto')
      .reduce((sum, acc) => sum + acc.value_usd, 0);

    return res.status(200).json({
      success: true,
      portfolio,
      summary: {
        totalValue,
        cashBalance,
        cryptoValue,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Portfolio error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
