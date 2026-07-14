/**
 * Alpaca Trading API Client (stocks)
 * Paper trading by default — set ALPACA_PAPER=false for live once validated.
 *
 * Auth: simple header keys (APCA-API-KEY-ID / APCA-API-SECRET-KEY)
 * Docs: https://docs.alpaca.markets
 *
 * Interface intentionally mirrors lib/coinbase/client.js so the strategy
 * and risk layers work identically across venues.
 */

const TRADING_BASE_PAPER = 'https://paper-api.alpaca.markets';
const TRADING_BASE_LIVE  = 'https://api.alpaca.markets';
const DATA_BASE          = 'https://data.alpaca.markets';

class AlpacaClient {
  constructor({ apiKey, apiSecret, paper = true }) {
    this.tradingBase = paper ? TRADING_BASE_PAPER : TRADING_BASE_LIVE;
    this.paper = paper;
    this.headers = {
      'APCA-API-KEY-ID':     apiKey,
      'APCA-API-SECRET-KEY': apiSecret,
      'Content-Type':        'application/json',
    };
  }

  async request(method, path, body = null, base = null) {
    const options = { method, headers: this.headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch((base || this.tradingBase) + path, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alpaca API ${response.status}: ${errorText}`);
    }
    // DELETE endpoints can return 204 with no body
    if (response.status === 204) return {};
    return response.json();
  }

  // ── Account & market state ─────────────────────────────────────────────────

  async getAccount() {
    return this.request('GET', '/v2/account');
  }

  async getClock() {
    return this.request('GET', '/v2/clock');
  }

  // ── Positions ──────────────────────────────────────────────────────────────

  async getPositions() {
    return this.request('GET', '/v2/positions');
  }

  async getPosition(symbol) {
    try {
      return await this.request('GET', `/v2/positions/${symbol}`);
    } catch (err) {
      if (err.message.includes('404')) return null; // no open position
      throw err;
    }
  }

  // ── Market data (free IEX feed) ────────────────────────────────────────────

  /**
   * Hourly candles, normalized to the Coinbase shape the indicator layer
   * expects: newest-first array of {start, open, high, low, close, volume}.
   */
  async getCandles(symbol, timeframe = '1Hour', limit = 200) {
    // ~6.5 trading hours/day → 200 hourly bars ≈ 31 trading days. Use 60
    // calendar days of history to be safe across holidays.
    const start = new Date(Date.now() - 60 * 86400000).toISOString();
    const data = await this.request(
      'GET',
      `/v2/stocks/${symbol}/bars?timeframe=${timeframe}&start=${start}&limit=${limit}&feed=iex&adjustment=split&sort=desc`,
      null,
      DATA_BASE
    );

    return (data.bars || []).map(b => ({
      start:  b.t,
      open:   b.o,
      high:   b.h,
      low:    b.l,
      close:  b.c,
      volume: b.v,
    }));
  }

  async getProductPrice(symbol) {
    const data = await this.request(
      'GET',
      `/v2/stocks/${symbol}/trades/latest?feed=iex`,
      null,
      DATA_BASE
    );
    return parseFloat(data.trade?.p);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  /**
   * Market BUY with attached exchange-enforced stop-loss and take-profit
   * (bracket order). The exits live server-side at Alpaca — no cron needed
   * for them to fire. Bracket orders require whole-share quantities.
   */
  async placeBracketBuy(symbol, qty, stopLossPrice, takeProfitPrice) {
    return this.request('POST', '/v2/orders', {
      symbol,
      qty:            Math.floor(qty).toString(),
      side:           'buy',
      type:           'market',
      time_in_force:  'gtc',
      order_class:    'bracket',
      take_profit: { limit_price: takeProfitPrice.toFixed(2) },
      stop_loss: {
        stop_price:  stopLossPrice.toFixed(2),
        limit_price: (stopLossPrice * 0.998).toFixed(2), // slightly below stop to ensure fill
      },
    });
  }

  async placeMarketOrder(symbol, side, qty) {
    return this.request('POST', '/v2/orders', {
      symbol,
      qty:           qty.toString(),
      side:          side.toLowerCase(),
      type:          'market',
      time_in_force: 'day',
    });
  }

  async getOrder(orderId) {
    return this.request('GET', `/v2/orders/${orderId}?nested=true`);
  }

  async listClosedOrders(symbol, limit = 20) {
    return this.request(
      'GET',
      `/v2/orders?status=closed&symbols=${symbol}&limit=${limit}&direction=desc`
    );
  }

  async cancelOrder(orderId) {
    return this.request('DELETE', `/v2/orders/${orderId}`);
  }

  /** Close an open position at market (also cancels linked bracket legs). */
  async closePosition(symbol) {
    return this.request('DELETE', `/v2/positions/${symbol}`);
  }
}

function createAlpacaClient() {
  const apiKey    = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('ALPACA_API_KEY and ALPACA_API_SECRET environment variables must be set');
  }

  // Paper unless explicitly switched to live
  const paper = process.env.ALPACA_PAPER !== 'false';
  return new AlpacaClient({ apiKey, apiSecret, paper });
}

function isAlpacaConfigured() {
  return Boolean(process.env.ALPACA_API_KEY && process.env.ALPACA_API_SECRET);
}

module.exports = { AlpacaClient, createAlpacaClient, isAlpacaConfigured };
