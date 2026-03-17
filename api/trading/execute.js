/**
 * POST /api/trading/execute
 * Manually execute a trade based on a signal
 * Body: { symbol, side, confidence, strategy, price, reason, positionSizeUSD? }
 */

const { createCoinbaseClient } = require('../../lib/coinbase/client');
const { supabase } = require('../../lib/supabase');
const { calculatePositionSize, calculateStopLevels, checkRiskLimits } = require('../../lib/trading/risk-manager');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && auth !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { symbol, side, confidence, strategy, price, reason, positionSizeUSD } = req.body;

  if (!symbol || !side || !strategy) {
    return res.status(400).json({ error: 'symbol, side, and strategy are required' });
  }

  try {
    const coinbase = createCoinbaseClient();

    // Get portfolio state
    const portfolio = await coinbase.getPortfolio();
    const totalValue = portfolio.reduce((sum, acc) => sum + acc.value_usd, 0);

    // Count open positions
    let openPositionCount = 0;
    if (supabase) {
      const { count } = await supabase
        .from('positions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'OPEN');
      openPositionCount = count || 0;
    }

    // Check risk limits
    const riskCheck = checkRiskLimits({
      totalValue,
      startOfDayValue: totalValue, // Simplified - would use snapshot in production
      openPositions: openPositionCount,
      tradingEnabled: true
    });

    if (!riskCheck.allowed) {
      return res.status(400).json({ error: riskCheck.reason });
    }

    // Calculate position size
    const tradeSize = positionSizeUSD || calculatePositionSize(totalValue, confidence || 0.7, openPositionCount);
    if (tradeSize < 10) {
      return res.status(400).json({ error: 'Position size too small (minimum $10)' });
    }

    // Get current price
    const currentPrice = await coinbase.getProductPrice(symbol);

    // Place order
    const order = await coinbase.placeOrder(symbol, side, tradeSize);
    const orderId = order.success_response?.order_id || order.order_id;

    if (!order.success && !orderId) {
      return res.status(400).json({
        error: 'Order placement failed',
        details: order.error_response || order
      });
    }

    // Calculate stop levels
    const { stopLoss, takeProfit } = calculateStopLevels(currentPrice, side);

    // Save to database
    if (supabase) {
      const { data: position, error } = await supabase.from('positions').insert({
        symbol,
        side: side.toUpperCase(),
        entry_price: currentPrice,
        size: tradeSize / currentPrice,
        strategy,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        status: 'OPEN',
        coinbase_order_id: orderId
      }).select().single();

      if (error) console.error('Failed to save position:', error.message);

      // Mark signal as executed
      await supabase.from('signals').update({ executed: true })
        .eq('symbol', symbol)
        .eq('signal', side.toUpperCase())
        .eq('executed', false)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    return res.status(200).json({
      success: true,
      orderId,
      symbol,
      side,
      size: tradeSize,
      price: currentPrice,
      stopLoss,
      takeProfit,
      message: `${side} order placed for ${symbol}: $${tradeSize.toFixed(2)}`
    });
  } catch (error) {
    console.error('Execute error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
