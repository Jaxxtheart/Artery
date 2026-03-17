/**
 * Coinbase Advanced Trade API Client
 * Handles authentication and all API calls to Coinbase
 */

const { createHmac } = require('crypto');

class CoinbaseClient {
  constructor(credentials) {
    this.baseUrl = 'https://api.coinbase.com/api/v3/brokerage';
    this.credentials = credentials;
  }

  async signRequest(method, path, body = '') {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = timestamp + method + path + body;

    const signature = createHmac('sha256', this.credentials.apiSecret)
      .update(message)
      .digest('hex');

    return {
      'CB-ACCESS-KEY': this.credentials.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'Content-Type': 'application/json',
    };
  }

  async request(method, path, body = null) {
    const bodyStr = body ? JSON.stringify(body) : '';
    const headers = await this.signRequest(method, path, bodyStr);

    const options = { method, headers };
    if (bodyStr) options.body = bodyStr;

    const response = await fetch(this.baseUrl + path, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Coinbase API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async getAccounts() {
    return this.request('GET', '/accounts');
  }

  async getPortfolio() {
    const data = await this.getAccounts();
    if (!data.accounts) return [];

    // Get current prices for non-USD assets
    const assets = data.accounts.filter(acc =>
      parseFloat(acc.available_balance.value) > 0
    );

    const portfolio = [];
    for (const acc of assets) {
      const currency = acc.currency;
      const balance = parseFloat(acc.available_balance.value);

      if (currency === 'USD' || currency === 'USDC') {
        portfolio.push({ currency, balance, value_usd: balance, type: 'cash' });
      } else if (balance > 0.000001) {
        try {
          const price = await this.getProductPrice(`${currency}-USD`);
          portfolio.push({
            currency,
            balance,
            value_usd: balance * price,
            price,
            type: 'crypto'
          });
        } catch {
          portfolio.push({ currency, balance, value_usd: 0, type: 'crypto' });
        }
      }
    }

    return portfolio;
  }

  async getProductPrice(symbol) {
    const data = await this.request('GET', `/products/${symbol}`);
    return parseFloat(data.price);
  }

  async getCandles(symbol, granularity = 'ONE_HOUR', limit = 200) {
    // Coinbase uses specific granularity strings
    const end = Math.floor(Date.now() / 1000);
    const granularitySeconds = {
      'ONE_MINUTE': 60,
      'FIVE_MINUTE': 300,
      'FIFTEEN_MINUTE': 900,
      'THIRTY_MINUTE': 1800,
      'ONE_HOUR': 3600,
      'TWO_HOUR': 7200,
      'SIX_HOUR': 21600,
      'ONE_DAY': 86400,
    };
    const start = end - (limit * (granularitySeconds[granularity] || 3600));

    const path = `/products/${symbol}/candles?granularity=${granularity}&start=${start}&end=${end}`;
    const data = await this.request('GET', path);
    return data.candles || [];
  }

  async placeOrder(symbol, side, quoteSize, orderType = 'market', limitPrice = null) {
    const orderConfig = orderType === 'market'
      ? { market_market_ioc: { quote_size: quoteSize.toString() } }
      : {
          limit_limit_gtc: {
            quote_size: quoteSize.toString(),
            limit_price: limitPrice.toString(),
            post_only: false
          }
        };

    const body = {
      client_order_id: `artery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      product_id: symbol,
      side: side.toUpperCase(),
      order_configuration: orderConfig
    };

    return this.request('POST', '/orders', body);
  }

  async cancelOrder(orderId) {
    return this.request('POST', '/orders/batch_cancel', { order_ids: [orderId] });
  }

  async getOrder(orderId) {
    return this.request('GET', `/orders/historical/${orderId}`);
  }

  async listOrders(status = 'OPEN') {
    return this.request('GET', `/orders/historical/batch?order_status=${status}`);
  }

  async getBestBidAsk(symbols) {
    const productIds = symbols.join('&product_ids=');
    return this.request('GET', `/best_bid_ask?product_ids=${productIds}`);
  }
}

function createCoinbaseClient() {
  const apiKey = process.env.COINBASE_API_KEY;
  const apiSecret = process.env.COINBASE_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('COINBASE_API_KEY and COINBASE_API_SECRET must be set');
  }

  return new CoinbaseClient({ apiKey, apiSecret });
}

module.exports = { CoinbaseClient, createCoinbaseClient };
