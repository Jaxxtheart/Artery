/**
 * Quantum Alpha Trading Strategies
 * Implements Momentum and Mean Reversion strategies
 */

const { calculateIndicators } = require('./indicators');

const MONITORED_SYMBOLS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD', 'MATIC-USD'];

/**
 * Momentum Strategy
 * Uses EMA crossover, RSI, and MACD for trend-following entries
 */
async function getMomentumSignal(symbol, candles) {
  if (!candles || candles.length < 52) {
    return holdSignal(symbol, 0, 'MOMENTUM', 'Insufficient data');
  }

  const indicators = calculateIndicators(candles);
  const last = indicators[indicators.length - 1];
  const prev = indicators[indicators.length - 2];

  if (!last || !prev || last.rsi === null || last.macdHist === null) {
    return holdSignal(symbol, last?.close || 0, 'MOMENTUM', 'Indicators not ready');
  }

  const emaBullish = last.ema20 > last.ema50;
  const emaCrossRecent = prev.ema20 <= prev.ema50 && last.ema20 > last.ema50; // Fresh cross
  const rsiHealthy = last.rsi > 40 && last.rsi < 65;
  const macdPositive = last.macdHist > 0 && last.macdHist > prev.macdHist;
  const aboveLongTrend = last.ema50 > last.ema200;

  if (emaBullish && rsiHealthy && macdPositive && aboveLongTrend) {
    let confidence = 0.60;
    if (emaCrossRecent) confidence += 0.15;
    if (last.rsi > 50) confidence += 0.10;
    if (last.macdHist > 0) confidence += 0.10;
    if (aboveLongTrend) confidence += 0.05;

    return {
      symbol,
      signal: 'BUY',
      confidence: Math.min(confidence, 0.95),
      strategy: 'MOMENTUM',
      price: last.close,
      reason: `EMA20>${emaBullish ? 'EMA50' : 'X'}, RSI:${last.rsi.toFixed(1)}, MACD+`
    };
  }

  // Exit signals for existing momentum positions
  const overbought = last.rsi > 75;
  const trendReversed = last.ema20 < last.ema50 && prev.ema20 >= prev.ema50;
  const macdNegative = last.macdHist < 0 && last.macdHist < prev.macdHist;

  if (overbought || trendReversed) {
    return {
      symbol,
      signal: 'SELL',
      confidence: overbought ? 0.85 : 0.75,
      strategy: 'MOMENTUM',
      price: last.close,
      reason: overbought ? `Overbought RSI:${last.rsi.toFixed(1)}` : 'EMA bearish cross'
    };
  }

  return holdSignal(symbol, last.close, 'MOMENTUM', 'No setup - waiting for alignment');
}

/**
 * Mean Reversion Strategy
 * Buys oversold dips using Bollinger Bands and RSI extremes
 */
async function getMeanReversionSignal(symbol, candles) {
  if (!candles || candles.length < 22) {
    return holdSignal(symbol, 0, 'MEAN_REVERSION', 'Insufficient data');
  }

  const indicators = calculateIndicators(candles);
  const last = indicators[indicators.length - 1];
  const dayAgo = indicators[Math.max(0, indicators.length - 25)]; // ~24 candles ago for 1h

  if (!last || last.rsi === null || last.bbLower === null) {
    return holdSignal(symbol, last?.close || 0, 'MEAN_REVERSION', 'Indicators not ready');
  }

  const change24h = dayAgo ? ((last.close - dayAgo.close) / dayAgo.close) * 100 : 0;

  // Entry: oversold + at lower BB + significant drop
  const oversold = last.rsi < 32;
  const atLowerBB = last.close <= last.bbLower * 1.01; // within 1% of lower band
  const significantDrop = change24h < -10;

  if (oversold && atLowerBB && significantDrop) {
    let confidence = 0.55;
    if (last.rsi < 25) confidence += 0.20;
    if (change24h < -20) confidence += 0.15;
    if (last.close <= last.bbLower) confidence += 0.10;

    return {
      symbol,
      signal: 'BUY',
      confidence: Math.min(confidence, 0.90),
      strategy: 'MEAN_REVERSION',
      price: last.close,
      reason: `Oversold: RSI ${last.rsi.toFixed(1)}, ${change24h.toFixed(1)}% 24h, at BB lower`
    };
  }

  // Exit: price returns to mean
  const returnedToMean = last.close >= last.bbMiddle;
  const overbought = last.rsi > 65;

  if (returnedToMean || overbought) {
    return {
      symbol,
      signal: 'SELL',
      confidence: 0.75,
      strategy: 'MEAN_REVERSION',
      price: last.close,
      reason: returnedToMean ? 'Returned to Bollinger middle band' : `RSI overbought: ${last.rsi.toFixed(1)}`
    };
  }

  return holdSignal(symbol, last.close, 'MEAN_REVERSION', 'No reversion setup');
}

/**
 * Breakout Strategy
 * Identifies consolidation breakouts with volume confirmation
 */
async function getBreakoutSignal(symbol, candles) {
  if (!candles || candles.length < 30) {
    return holdSignal(symbol, 0, 'BREAKOUT', 'Insufficient data');
  }

  const indicators = calculateIndicators(candles);
  const last = indicators[indicators.length - 1];
  const recent = indicators.slice(-20);

  if (!last || last.atr === null) {
    return holdSignal(symbol, last?.close || 0, 'BREAKOUT', 'Indicators not ready');
  }

  // Find 20-period high/low
  const high20 = Math.max(...recent.map(c => c.high));
  const low20 = Math.min(...recent.map(c => c.low));
  const avgVolume = recent.slice(0, -1).reduce((s, c) => s + c.volume, 0) / (recent.length - 1);
  const volumeSpike = last.volume > avgVolume * 1.5;

  // Breakout above 20-period high
  if (last.close > high20 * 0.998 && volumeSpike && last.rsi < 75) {
    return {
      symbol,
      signal: 'BUY',
      confidence: 0.65 + (volumeSpike ? 0.15 : 0),
      strategy: 'BREAKOUT',
      price: last.close,
      reason: `Breakout above ${high20.toFixed(2)} with volume spike`
    };
  }

  // Breakdown below 20-period low
  if (last.close < low20 * 1.002 && volumeSpike) {
    return {
      symbol,
      signal: 'SELL',
      confidence: 0.70,
      strategy: 'BREAKOUT',
      price: last.close,
      reason: `Breakdown below ${low20.toFixed(2)}`
    };
  }

  return holdSignal(symbol, last.close, 'BREAKOUT', 'No breakout setup');
}

function holdSignal(symbol, price, strategy, reason) {
  return { symbol, signal: 'HOLD', confidence: 0, strategy, price, reason };
}

/**
 * Generate signals for all monitored assets
 */
async function getAllSignals(coinbaseClient) {
  const signals = [];

  for (const symbol of MONITORED_SYMBOLS) {
    try {
      const candles = await coinbaseClient.getCandles(symbol, 'ONE_HOUR', 200);

      const [momentum, meanReversion, breakout] = await Promise.all([
        getMomentumSignal(symbol, candles),
        getMeanReversionSignal(symbol, candles),
        getBreakoutSignal(symbol, candles)
      ]);

      // Add all actionable signals
      [momentum, meanReversion, breakout].forEach(sig => {
        if (sig.signal !== 'HOLD' && sig.confidence > 0.5) {
          signals.push(sig);
        }
      });

      // If no strong signal, add best HOLD for status display
      if (![momentum, meanReversion, breakout].some(s => s.signal !== 'HOLD')) {
        const best = [momentum, meanReversion, breakout].sort((a, b) => b.confidence - a.confidence)[0];
        signals.push(best);
      }
    } catch (error) {
      console.error(`Error getting signals for ${symbol}:`, error.message);
      signals.push({
        symbol,
        signal: 'HOLD',
        confidence: 0,
        strategy: 'ERROR',
        price: 0,
        reason: error.message
      });
    }
  }

  return signals.sort((a, b) => b.confidence - a.confidence);
}

module.exports = {
  getMomentumSignal,
  getMeanReversionSignal,
  getBreakoutSignal,
  getAllSignals,
  MONITORED_SYMBOLS
};
