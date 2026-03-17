/**
 * POST /api/coinbase/orders - Place an order
 * DELETE /api/coinbase/orders - Cancel an order
 * GET /api/coinbase/orders - List open orders
 */

const { createCoinbaseClient } = require('../../lib/coinbase/client');

module.exports = async function handler(req, res) {
  // Verify admin auth
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && auth !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const coinbase = createCoinbaseClient();

  try {
    if (req.method === 'GET') {
      const orders = await coinbase.listOrders('OPEN');
      return res.status(200).json({ success: true, orders });
    }

    if (req.method === 'POST') {
      const { symbol, side, quoteSize, orderType, limitPrice } = req.body;

      if (!symbol || !side || !quoteSize) {
        return res.status(400).json({ error: 'symbol, side, and quoteSize are required' });
      }

      const order = await coinbase.placeOrder(symbol, side, quoteSize, orderType, limitPrice);
      return res.status(200).json({ success: true, order });
    }

    if (req.method === 'DELETE') {
      const { orderId } = req.body;
      if (!orderId) return res.status(400).json({ error: 'orderId is required' });

      const result = await coinbase.cancelOrder(orderId);
      return res.status(200).json({ success: true, result });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Orders error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
