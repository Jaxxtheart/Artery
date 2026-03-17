/**
 * Technical Indicators
 * Calculates EMA, RSI, MACD, Bollinger Bands from OHLCV candle data
 */

/**
 * Exponential Moving Average
 */
function ema(values, period) {
  const k = 2 / (period + 1);
  const result = [];
  let prev = values[0];

  for (let i = 0; i < values.length; i++) {
    const current = i === 0 ? values[0] : values[i] * k + prev * (1 - k);
    result.push(current);
    prev = current;
  }
  return result;
}

/**
 * Simple Moving Average
 */
function sma(values, period) {
  const result = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = values.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

/**
 * Relative Strength Index
 */
function rsi(closes, period = 14) {
  const result = [];
  const gains = [];
  const losses = [];

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  result.push(null); // no RSI for first candle

  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    let avgGain, avgLoss;
    if (i === period - 1) {
      avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    } else {
      const prevAvgGain = result[result.length - 1]._avgGain;
      const prevAvgLoss = result[result.length - 1]._avgLoss;
      avgGain = (prevAvgGain * (period - 1) + gains[i]) / period;
      avgLoss = (prevAvgLoss * (period - 1) + losses[i]) / period;
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsiVal = 100 - (100 / (1 + rs));
    const entry = rsiVal;
    entry._avgGain = avgGain;
    entry._avgLoss = avgLoss;
    result.push(entry);
  }

  // Clean up internal state properties
  return result.map(v => (typeof v === 'number' ? v : null));
}

/**
 * MACD (12, 26, 9)
 */
function macd(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);

  const macdLine = fastEma.map((f, i) => f - slowEma[i]);
  const signalLine = ema(macdLine, signalPeriod);
  const histogram = macdLine.map((m, i) => m - signalLine[i]);

  return { macdLine, signalLine, histogram };
}

/**
 * Bollinger Bands (20, 2)
 */
function bollingerBands(closes, period = 20, stdDevMultiplier = 2) {
  const middle = sma(closes, period);
  const upper = [];
  const lower = [];

  for (let i = 0; i < closes.length; i++) {
    if (middle[i] === null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    const slice = closes.slice(Math.max(0, i - period + 1), i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
    const stdDev = Math.sqrt(variance);
    upper.push(middle[i] + stdDevMultiplier * stdDev);
    lower.push(middle[i] - stdDevMultiplier * stdDev);
  }

  return { upper, middle, lower };
}

/**
 * Calculate Average True Range
 */
function atr(highs, lows, closes, period = 14) {
  const tr = [closes[0]]; // first TR is just close
  for (let i = 1; i < closes.length; i++) {
    const trueRange = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    tr.push(trueRange);
  }
  return ema(tr, period);
}

/**
 * Calculate all indicators from candle data
 * Coinbase candles: [start, low, high, open, close, volume]
 */
function calculateIndicators(candles) {
  // Coinbase returns candles newest first - reverse to oldest first
  const sorted = [...candles].reverse();

  const opens = sorted.map(c => parseFloat(c.open || c[3]));
  const highs = sorted.map(c => parseFloat(c.high || c[2]));
  const lows = sorted.map(c => parseFloat(c.low || c[1]));
  const closes = sorted.map(c => parseFloat(c.close || c[4]));
  const volumes = sorted.map(c => parseFloat(c.volume || c[5]));

  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);
  const rsiValues = calculateRSI(closes, 14);
  const { macdLine, signalLine, histogram } = macd(closes);
  const { upper: bbUpper, middle: bbMiddle, lower: bbLower } = bollingerBands(closes);
  const atrValues = atr(highs, lows, closes);

  return sorted.map((candle, i) => ({
    timestamp: parseInt(candle.start || candle[0]),
    open: opens[i],
    high: highs[i],
    low: lows[i],
    close: closes[i],
    volume: volumes[i],
    ema20: ema20[i],
    ema50: ema50[i],
    ema200: ema200[i],
    rsi: rsiValues[i],
    macd: macdLine[i],
    macdSignal: signalLine[i],
    macdHist: histogram[i],
    bbUpper: bbUpper[i],
    bbMiddle: bbMiddle[i],
    bbLower: bbLower[i],
    atr: atrValues[i],
  }));
}

/**
 * Proper RSI calculation using Wilder's smoothing
 */
function calculateRSI(closes, period = 14) {
  const result = new Array(period).fill(null);
  let avgGain = 0;
  let avgLoss = 0;

  // Initial average
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + rs0));

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }

  return result;
}

module.exports = { calculateIndicators, ema, sma, calculateRSI, macd, bollingerBands, atr };
