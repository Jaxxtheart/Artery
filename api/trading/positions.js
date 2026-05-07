/**
 * GET /api/trading/positions - Get open positions
 * DELETE /api/trading/positions - Force close a position
 * PATCH /api/trading/positions - Update trading enabled flag
 */

const { supabase } = require('../../lib/supabase');
const { createCoinbaseClient } = require('../../lib/coinbase/client');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (!supabase) return res.status(200).json({ success: true, positions: [] });

      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('status', 'OPEN')
        .order('entry_time', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ success: true, positions: data });
    }

    // Auth for write operations
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${process.env.CRON_SECRET}` && auth !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'DELETE') {
      const { positionId } = req.body;
      if (!positionId) return res.status(400).json({ error: 'positionId required' });

      const { data: position, error: fetchError } = await supabase
        .from('positions')
        .select('*')
        .eq('id', positionId)
        .single();

      if (fetchError || !position) return res.status(404).json({ error: 'Position not found' });

      // Get current price and close on exchange
      const coinbase = createCoinbaseClient();
      const currentPrice = await coinbase.getProductPrice(position.symbol);
      const closeSide = position.side === 'BUY' ? 'SELL' : 'BUY';

      // SELL uses base_size (crypto units) — position.size is already in crypto units
      const productDetails = await coinbase.getProductDetails(position.symbol).catch(() => ({}));
      const baseIncrement  = productDetails.base_increment || '0.00000001';
      const decimals = (baseIncrement.toString().split('.')[1] || '').length;
      const sellSize = parseFloat((position.size * 0.999).toFixed(decimals));

      const order = await coinbase.placeOrder(position.symbol, closeSide, sellSize);
      const orderId = order.success_response?.order_id || order.order_id;
      const orderSuccess = !!(order.success || orderId);

      if (!orderSuccess) {
        const cb = order.error_response || {};
        const reason = cb.preview_failure_reason || cb.new_order_failure_reason || cb.message || cb.error || JSON.stringify(order);
        return res.status(400).json({ error: `Coinbase order failed — position NOT closed: ${reason}`, details: order });
      }

      // Update position in DB
      const pnlUsd = (currentPrice - position.entry_price) * position.size;
      const pnlPct = ((currentPrice - position.entry_price) / position.entry_price) * 100;
      const entryTime = new Date(position.entry_time);
      const durationHours = (Date.now() - entryTime.getTime()) / 3600000;

      await supabase.from('positions').update({
        status: 'CLOSED',
        exit_price: currentPrice,
        exit_time: new Date().toISOString(),
        pnl_usd: pnlUsd,
        pnl_pct: pnlPct
      }).eq('id', positionId);

      // Add to trade history
      await supabase.from('trade_history').insert({
        symbol: position.symbol,
        side: position.side,
        entry_price: position.entry_price,
        exit_price: currentPrice,
        size: position.size,
        pnl_usd: pnlUsd,
        pnl_pct: pnlPct,
        strategy: position.strategy,
        reason: 'Manual close',
        duration_hours: durationHours,
        entry_time: position.entry_time,
        exit_time: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: `Position closed: ${pnlUsd >= 0 ? '+' : ''}$${pnlUsd.toFixed(2)} (${pnlPct.toFixed(2)}%)`
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Positions error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
