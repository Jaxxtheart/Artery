/**
 * Stock strategy runner — applies the same Momentum / Mean Reversion /
 * Breakout strategies used for crypto to a US equity watchlist via Alpaca.
 *
 * Candles from AlpacaClient.getCandles() are normalized to the same shape
 * as Coinbase candles, so the indicator and strategy layers are shared.
 */

const {
  getMomentumSignal,
  getMeanReversionSignal,
  getBreakoutSignal,
} = require('./strategies');

// Liquid, strategy-friendly US equities + index ETFs
const STOCK_SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL'];
const STOCK_STRATEGY_SYMBOLS = new Set(STOCK_SYMBOLS);

async function getAllStockSignals(alpacaClient) {
  const signals = [];

  for (const symbol of STOCK_SYMBOLS) {
    try {
      const candles = await alpacaClient.getCandles(symbol, '1Hour', 200);

      const [momentum, meanReversion, breakout] = await Promise.all([
        getMomentumSignal(symbol, candles),
        getMeanReversionSignal(symbol, candles),
        getBreakoutSignal(symbol, candles),
      ]);

      [momentum, meanReversion, breakout].forEach(sig => {
        if (sig.signal !== 'HOLD' && sig.confidence > 0.5) {
          signals.push({ ...sig, asset_class: 'STOCK' });
        }
      });

      // Keep the best HOLD for status display when nothing is actionable
      if (![momentum, meanReversion, breakout].some(s => s.signal !== 'HOLD')) {
        const best = [momentum, meanReversion, breakout]
          .sort((a, b) => b.confidence - a.confidence)[0];
        signals.push({ ...best, asset_class: 'STOCK' });
      }
    } catch (error) {
      console.error(`Error getting stock signals for ${symbol}:`, error.message);
      signals.push({
        symbol,
        signal: 'HOLD',
        confidence: 0,
        strategy: 'ERROR',
        price: 0,
        reason: error.message,
        asset_class: 'STOCK',
      });
    }
  }

  return signals.sort((a, b) => b.confidence - a.confidence);
}

module.exports = { getAllStockSignals, STOCK_SYMBOLS, STOCK_STRATEGY_SYMBOLS };
