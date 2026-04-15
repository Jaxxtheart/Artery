/**
 * POST /api/trading/test-order
 * Validates an order against Coinbase's preview endpoint WITHOUT placing it.
 * Returns exactly what Coinbase would execute: estimated price, fee, total cost.
 *
 * Body: { symbol, side, strategy }
 * Auth: Authorization: Bearer <ADMIN_PASSWORD>
 */

const { createCoinbaseClient } = require('../../lib/coinbase/client');
const { calculatePositionSize, checkRiskLimits } = require('../../lib/trading/risk-manager');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { symbol, side, confidence = 0.7, positionSizeUSD } = req.body;
  if (!symbol || !side) {
    return res.status(400).json({ error: 'symbol and side are required' });
  }

  const isBuy  = side.toUpperCase() === 'BUY';
  const ticker = symbol.replace('-USD', '');

  try {
    const coinbase = createCoinbaseClient();

    // Gather live data
    const [portfolio, currentPrice] = await Promise.all([
      coinbase.getPortfolio(),
      coinbase.getProductPrice(symbol),
    ]);

    const totalValue  = portfolio.reduce((s, a) => s + a.value_usd, 0);
    const asset       = portfolio.find(a => a.currency === ticker);
    const cashBalance = portfolio.filter(a => a.type === 'cash').reduce((s, a) => s + a.value_usd, 0);

    // Risk check
    const riskCheck = checkRiskLimits({ totalValue, startOfDayValue: totalValue, openPositions: 0, tradingEnabled: true });

    // Determine size
    let orderSize, orderSizeLabel;
    if (isBuy) {
      orderSize = positionSizeUSD || calculatePositionSize(cashBalance, confidence, 0);
      orderSizeLabel = `$${orderSize.toFixed(2)} USD`;
    } else {
      orderSize = asset?.balance || 0;
      orderSizeLabel = `${orderSize.toFixed(6)} ${ticker}`;
    }

    // Validate before preview
    const checks = {
      has_api_credentials: true,
      symbol_valid:        true,
      side_valid:          ['BUY', 'SELL'].includes(side.toUpperCase()),
      has_balance_to_sell: isBuy ? null : (orderSize > 0),
      sufficient_cash:     isBuy ? (cashBalance >= orderSize) : null,
      min_order_size:      isBuy ? (orderSize >= 10) : (orderSize * currentPrice >= 1),
      risk_check_passed:   riskCheck.allowed,
      risk_reason:         riskCheck.allowed ? null : riskCheck.reason,
    };

    const failed = Object.entries(checks)
      .filter(([k, v]) => v === false)
      .map(([k]) => k);

    if (failed.length > 0) {
      return res.status(200).json({
        success: false,
        would_succeed: false,
        failed_checks: failed,
        checks,
        order_params: { symbol, side, orderSize, orderSizeLabel, currentPrice },
        portfolio_snapshot: { totalValue, cashBalance, assetBalance: asset?.balance || 0 }
      });
    }

    // Call Coinbase preview — no real order placed
    let preview = null;
    let previewError = null;
    try {
      preview = await coinbase.previewOrder(symbol, side, orderSize);
    } catch (e) {
      previewError = e.message;
    }

    return res.status(200).json({
      success: true,
      would_succeed: !previewError,
      checks,
      order_params: {
        symbol,
        side: side.toUpperCase(),
        orderSize,
        orderSizeLabel,
        currentPrice,
        size_field: isBuy ? 'quote_size' : 'base_size',
      },
      portfolio_snapshot: {
        totalValue,
        cashBalance,
        assetBalance: asset?.balance || 0,
        assetValueUSD: asset?.value_usd || 0,
      },
      coinbase_preview: preview || null,
      preview_error: previewError || null,
    });
  } catch (error) {
    console.error('Test order error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
