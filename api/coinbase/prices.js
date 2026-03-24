/**
 * GET /api/coinbase/prices?symbols=BTC-USD,ETH-USD
 * Fetch current prices for given symbols
 */

const { createCoinbaseClient } = require('../../lib/coinbase/client');

const DEFAULT_SYMBOLS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD', 'POL-USD', 'LINK-USD', 'ADA-USD', 'DOGE-USD'];

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const coinbase = createCoinbaseClient();
    const symbolList = req.query.symbols
      ? req.query.symbols.split(',')
      : DEFAULT_SYMBOLS;

    const prices = {};
    await Promise.all(
      symbolList.map(async (symbol) => {
        try {
          prices[symbol] = await coinbase.getProductPrice(symbol);
        } catch (err) {
          prices[symbol] = null;
        }
      })
    );

    return res.status(200).json({
      success: true,
      prices,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Prices error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
