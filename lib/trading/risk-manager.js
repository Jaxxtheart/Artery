/**
 * Risk Manager
 * Handles position sizing, stop losses, and portfolio risk controls
 */

const MAX_POSITIONS = 2;
const MAX_POSITION_PCT = 0.25;       // Max 25% of portfolio per position
const DAILY_LOSS_LIMIT_PCT = 0.08;   // 8% daily loss circuit breaker
const STOP_LOSS_PCT = 0.05;          // 5% — room to breathe through hourly volatility
const TAKE_PROFIT_PCT = 0.20;        // 20% — captures meaningful bull cycle legs
const MIN_CONFIDENCE = 0.65;         // Minimum signal confidence to trade

/**
 * Calculate position size using confidence-tiered sizing.
 * Higher conviction signals deploy more capital; avoids treating a 65% and 90%
 * signal identically (the old Kelly cap always hit 25% regardless of confidence).
 *
 * @param {number} cashBalance - Deployable USD cash
 * @param {number} confidence  - Signal confidence (0–1)
 * @param {number} openPositions - Number of currently open positions
 * @returns {number} Position size in USD
 */
function calculatePositionSize(cashBalance, confidence, openPositions) {
  if (openPositions >= MAX_POSITIONS) return 0;

  let fraction;
  if (confidence >= 0.85) {
    fraction = 0.25;   // strong conviction — deploy full 25%
  } else if (confidence >= 0.75) {
    fraction = 0.17;   // medium conviction — 17%
  } else {
    fraction = 0.10;   // minimum valid signal — 10%
  }

  return cashBalance * fraction;
}

/**
 * Calculate stop loss and take profit levels.
 * Prefers ATR-based stops when available; falls back to fixed percentage.
 * ATR stops auto-widen during volatile periods and tighten in calm markets.
 */
function calculateStopLevels(entryPrice, side = 'BUY', atr = null) {
  const stopDistance   = atr ? Math.max(atr * 2, entryPrice * STOP_LOSS_PCT)   : entryPrice * STOP_LOSS_PCT;
  const profitDistance = atr ? Math.max(atr * 5, entryPrice * TAKE_PROFIT_PCT) : entryPrice * TAKE_PROFIT_PCT;

  if (side === 'BUY') {
    return {
      stopLoss:   entryPrice - stopDistance,
      takeProfit: entryPrice + profitDistance
    };
  } else {
    return {
      stopLoss:   entryPrice + stopDistance,
      takeProfit: entryPrice - profitDistance
    };
  }
}

/**
 * Check if trading is allowed given current portfolio state
 */
function checkRiskLimits(portfolioState) {
  const { totalValue, startOfDayValue, openPositions, tradingEnabled } = portfolioState;

  if (!tradingEnabled) {
    return { allowed: false, reason: 'Trading is manually disabled' };
  }

  if (openPositions >= MAX_POSITIONS) {
    return { allowed: false, reason: `Max positions reached (${MAX_POSITIONS})` };
  }

  // Daily loss circuit breaker
  if (startOfDayValue && totalValue < startOfDayValue * (1 - DAILY_LOSS_LIMIT_PCT)) {
    const lossPercent = ((startOfDayValue - totalValue) / startOfDayValue * 100).toFixed(2);
    return {
      allowed: false,
      reason: `Daily loss limit hit: -${lossPercent}% (limit: ${DAILY_LOSS_LIMIT_PCT * 100}%)`
    };
  }

  return { allowed: true, reason: 'Risk limits OK' };
}

/**
 * Calculate portfolio risk metrics
 */
function calculateRiskMetrics(positions, portfolioValue) {
  if (!positions || positions.length === 0) {
    return {
      totalExposure: 0,
      exposurePct: 0,
      maxDrawdown: 0,
      avgRisk: 0,
      positionCount: 0
    };
  }

  const totalExposure = positions.reduce((sum, pos) => {
    return sum + (pos.size * pos.entry_price);
  }, 0);

  const totalPnL = positions.reduce((sum, pos) => sum + (pos.pnl_usd || 0), 0);

  return {
    totalExposure,
    exposurePct: portfolioValue > 0 ? (totalExposure / portfolioValue) * 100 : 0,
    totalPnL,
    totalPnLPct: portfolioValue > 0 ? (totalPnL / portfolioValue) * 100 : 0,
    positionCount: positions.length,
    maxAllowedPositions: MAX_POSITIONS,
    dailyLossLimit: DAILY_LOSS_LIMIT_PCT * 100,
    stopLossPct: STOP_LOSS_PCT * 100,
    takeProfitPct: TAKE_PROFIT_PCT * 100
  };
}

/**
 * Check if an existing position should be closed based on current price
 */
function shouldClosePosition(position, currentPrice) {
  const { entry_price, stop_loss, take_profit, side } = position;

  if (side === 'BUY') {
    if (stop_loss && currentPrice <= stop_loss) {
      return { close: true, reason: `Stop loss hit: ${currentPrice.toFixed(4)} <= ${stop_loss}` };
    }
    if (take_profit && currentPrice >= take_profit) {
      return { close: true, reason: `Take profit hit: ${currentPrice.toFixed(4)} >= ${take_profit}` };
    }
  }

  return { close: false, reason: 'Position within bounds' };
}

module.exports = {
  calculatePositionSize,
  calculateStopLevels,
  checkRiskLimits,
  calculateRiskMetrics,
  shouldClosePosition,
  MAX_POSITIONS,
  MIN_CONFIDENCE,
  STOP_LOSS_PCT,
  TAKE_PROFIT_PCT,
  DAILY_LOSS_LIMIT_PCT
};
