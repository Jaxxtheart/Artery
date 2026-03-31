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

  const { symbol, side, confidence, strategy, price, reason, positionSizeUSD, dry_run = false } = req.body;

  if (!symbol || !side || !strategy) {
    return res.status(400).json({ error: 'symbol, side, and strategy are required' });
  }

  const isBuy  = side.toUpperCase() === 'BUY';
  const isSell = side.toUpperCase() === 'SELL';

  // Round a value to the decimal precision defined by a Coinbase increment string
  // e.g. base_increment "0.01" → 2 dp,  "1" → 0 dp,  "0.00000001" → 8 dp
  function roundToIncrement(value, increment = '0.00000001') {
    const decimals = (increment.toString().split('.')[1] || '').length;
    return parseFloat(value.toFixed(decimals));
  }

  try {
    const coinbase = createCoinbaseClient();

    // Fetch portfolio first — needed for both risk check and SELL base size
    const portfolio  = await coinbase.getPortfolio();
    const totalValue = portfolio.reduce((sum, acc) => sum + acc.value_usd, 0);
    const ticker     = symbol.replace('-USD', '');
    const asset      = portfolio.find(a => a.currency === ticker);
    const currentPrice = await coinbase.getProductPrice(symbol);

    // Count open positions
    let openPositionCount = 0;
    if (supabase) {
      const { count } = await supabase
        .from('positions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'OPEN');
      openPositionCount = count || 0;
    }

    // Risk check (only enforced for BUY — SELL reduces exposure)
    if (isBuy) {
      const riskCheck = checkRiskLimits({
        totalValue,
        startOfDayValue: totalValue,
        openPositions: openPositionCount,
        tradingEnabled: true
      });
      if (!riskCheck.allowed) {
        return res.status(400).json({ error: riskCheck.reason });
      }
    }

    // Determine order size
    // BUY  → quote_size in USD (how much to spend)
    // SELL → base_size in crypto units (how many to sell — full balance)
    let orderSize;
    if (isBuy) {
      orderSize = positionSizeUSD || calculatePositionSize(totalValue, confidence || 0.7, openPositionCount);
      if (orderSize < 10) {
        return res.status(400).json({ error: 'Position size too small (minimum $10)' });
      }
    } else {
      // Sell the full holding of this coin
      if (!asset || asset.balance <= 0) {
        return res.status(400).json({ error: `No ${ticker} balance to sell` });
      }
      // Round to product's base_increment precision to avoid INVALID_SIZE_PRECISION
      const productDetails = await coinbase.getProductDetails(symbol).catch(() => ({}));
      const baseIncrement  = productDetails.base_increment || '0.00000001';
      // Trim 0.1% first so rounding doesn't push us above available balance
      orderSize = roundToIncrement(asset.balance * 0.999, baseIncrement);
    }

    // Dry run — use preview endpoint, no real order placed
    if (dry_run) {
      let preview = null;
      let previewError = null;
      try {
        preview = await coinbase.previewOrder(symbol, side, orderSize);
      } catch (e) {
        previewError = e.message;
      }
      return res.status(200).json({
        success: true,
        dry_run: true,
        would_succeed: !previewError,
        order_params: {
          symbol, side: side.toUpperCase(), orderSize,
          orderSizeLabel: isBuy ? `$${orderSize.toFixed(2)} USD` : `${orderSize} ${ticker}`,
          size_field: isBuy ? 'quote_size' : 'base_size',
          currentPrice,
        },
        portfolio_snapshot: {
          totalValue,
          cashBalance: portfolio.filter(a => a.type === 'cash').reduce((s, a) => s + a.value_usd, 0),
          assetBalance: asset?.balance || 0,
          assetValueUSD: asset?.value_usd || 0,
        },
        coinbase_preview: preview,
        preview_error: previewError,
      });
    }

    // Place order
    const order    = await coinbase.placeOrder(symbol, side, orderSize);
    const orderId  = order.success_response?.order_id || order.order_id;
    const success  = !!(order.success || orderId);

    if (!success) {
      const cb = order.error_response || {};
      const reason = cb.preview_failure_reason || cb.new_order_failure_reason || cb.message || cb.error || JSON.stringify(order);
      return res.status(400).json({
        error: `Order placement failed: ${reason}`,
        details: order
      });
    }

    // Calculate stop levels (BUY positions only)
    const { stopLoss, takeProfit } = calculateStopLevels(currentPrice, side);

    // Save to database
    if (supabase) {
      if (isBuy) {
        await supabase.from('positions').insert({
          symbol,
          side: 'BUY',
          entry_price: currentPrice,
          size: orderSize / currentPrice,
          strategy,
          stop_loss: stopLoss,
          take_profit: takeProfit,
          status: 'OPEN',
          coinbase_order_id: orderId
        });
      } else {
        // Record sell in trade history if there's a tracked position to close
        const { data: openPos } = await supabase
          .from('positions')
          .select('*')
          .eq('symbol', symbol)
          .eq('status', 'OPEN')
          .limit(1)
          .single();

        if (openPos) {
          const pnlUsd = (currentPrice - openPos.entry_price) * openPos.size;
          const pnlPct = ((currentPrice - openPos.entry_price) / openPos.entry_price) * 100;
          await supabase.from('positions').update({
            status: 'CLOSED',
            exit_price: currentPrice,
            exit_time: new Date().toISOString(),
            pnl_usd: pnlUsd,
            pnl_pct: pnlPct
          }).eq('id', openPos.id);
          await supabase.from('trade_history').insert({
            symbol, side: 'SELL', entry_price: openPos.entry_price, exit_price: currentPrice,
            size: openPos.size, pnl_usd: pnlUsd, pnl_pct: pnlPct, strategy,
            reason: reason || 'Manual sell', entry_time: openPos.entry_time,
            exit_time: new Date().toISOString(),
            duration_hours: (Date.now() - new Date(openPos.entry_time).getTime()) / 3600000
          });
        }
      }

      await supabase.from('signals').update({ executed: true })
        .eq('symbol', symbol).eq('signal', side.toUpperCase()).eq('executed', false);
    }

    const sizeLabel = isBuy
      ? `$${orderSize.toFixed(2)}`
      : `${orderSize.toFixed(6)} ${ticker} (≈$${(orderSize * currentPrice).toFixed(2)})`;

    return res.status(200).json({
      success: true,
      orderId,
      symbol,
      side,
      orderSize,
      price: currentPrice,
      stopLoss: isBuy ? stopLoss : null,
      takeProfit: isBuy ? takeProfit : null,
      message: `${side} order placed for ${symbol}: ${sizeLabel}`
    });
  } catch (error) {
    console.error('Execute error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
