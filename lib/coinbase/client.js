/**
 * Coinbase Advanced Trade API Client
 * Supports both:
 *   - Legacy API keys  (HMAC-SHA256)
 *   - CDP API keys     (ES256 JWT)  — EC private key (BEGIN EC PRIVATE KEY)
 *   - CDP API keys     (EdDSA JWT)  — Ed25519 private key (BEGIN PRIVATE KEY)
 *
 * CDP keys look like:  organizations/{org_id}/apiKeys/{key_id}
 * Legacy keys are short alphanumeric strings (no forward slash)
 */

const { createHmac, createPrivateKey, randomBytes, sign: cryptoSign } = require('crypto');

// ── Detect key type ──────────────────────────────────────────────────────────

function isCDPKey(apiKey) {
  return typeof apiKey === 'string' && (
    apiKey.startsWith('organizations/') || apiKey.startsWith('projects/')
  );
}

// ── CDP JWT signing (ES256 or EdDSA) ─────────────────────────────────────────

function signCDPJWT(keyName, privateKeyPem, method, path) {
  // Normalise PEM — Vercel env vars collapse \n to literal backslash-n
  const pem = privateKeyPem.replace(/\\n/g, '\n');

  // Detect algorithm from PEM header:
  //   "BEGIN EC PRIVATE KEY"  → ES256 (P-256)
  //   "BEGIN PRIVATE KEY"     → EdDSA (Ed25519, PKCS#8 wrapped)
  const isEd25519 = pem.includes('BEGIN PRIVATE KEY') && !pem.includes('BEGIN EC PRIVATE KEY');

  const header = {
    alg: isEd25519 ? 'EdDSA' : 'ES256',
    kid: keyName,
    nonce: randomBytes(16).toString('hex'),
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: keyName,
    iss: 'cdp',
    nbf: now,
    exp: now + 120,
    // URI must be: METHOD host+path  (no https://)
    uri: `${method} api.coinbase.com/api/v3/brokerage${path}`,
  };

  const headerB64  = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${headerB64}.${payloadB64}`;

  const privateKey = createPrivateKey(pem);

  let sig;
  if (isEd25519) {
    // Ed25519 signs the message directly — no hash algorithm
    sig = cryptoSign(null, Buffer.from(signingInput), privateKey);
  } else {
    // EC P-256: ieee-p1363 gives raw r||s bytes (64 bytes) required for JWT ES256
    sig = cryptoSign('sha256', Buffer.from(signingInput), {
      key: privateKey,
      dsaEncoding: 'ieee-p1363',
    });
  }

  return `${signingInput}.${sig.toString('base64url')}`;
}

// ── Client class ─────────────────────────────────────────────────────────────

class CoinbaseClient {
  constructor(credentials) {
    this.baseUrl = 'https://api.coinbase.com/api/v3/brokerage';
    this.credentials = credentials;
    this.useCDP = isCDPKey(credentials.apiKey);
  }

  buildHeaders(method, path, bodyStr = '') {
    if (this.useCDP) {
      const jwt = signCDPJWT(
        this.credentials.apiKey,
        this.credentials.apiSecret,
        method,
        path
      );
      return {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      };
    }

    // Legacy HMAC — path must include the full /api/v3/brokerage prefix
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = timestamp + method + '/api/v3/brokerage' + path + bodyStr;
    const signature = createHmac('sha256', this.credentials.apiSecret)
      .update(message)
      .digest('hex');

    return {
      'CB-ACCESS-KEY':       this.credentials.apiKey,
      'CB-ACCESS-SIGN':      signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'Content-Type':        'application/json',
    };
  }

  async request(method, path, body = null) {
    const bodyStr = body ? JSON.stringify(body) : '';
    const headers = this.buildHeaders(method, path, bodyStr);

    const options = { method, headers };
    if (bodyStr) options.body = bodyStr;

    const response = await fetch(this.baseUrl + path, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Coinbase API ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async getAccounts() {
    return this.request('GET', '/accounts');
  }

  async getPortfolio() {
    const data = await this.getAccounts();
    if (!data.accounts) return [];

    const assets = data.accounts.filter(acc =>
      parseFloat(acc.available_balance?.value || 0) > 0
    );

    const portfolio = [];
    for (const acc of assets) {
      const currency = acc.currency;
      const balance  = parseFloat(acc.available_balance?.value || 0);

      if (currency === 'USD' || currency === 'USDC') {
        portfolio.push({ currency, balance, value_usd: balance, type: 'cash' });
      } else if (balance > 0.000001) {
        try {
          const price = await this.getProductPrice(`${currency}-USD`);
          portfolio.push({ currency, balance, value_usd: balance * price, price, type: 'crypto' });
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
    const granularitySeconds = {
      ONE_MINUTE: 60, FIVE_MINUTE: 300, FIFTEEN_MINUTE: 900,
      THIRTY_MINUTE: 1800, ONE_HOUR: 3600, TWO_HOUR: 7200,
      SIX_HOUR: 21600, ONE_DAY: 86400,
    };
    const end   = Math.floor(Date.now() / 1000);
    const start = end - (limit * (granularitySeconds[granularity] || 3600));

    const data = await this.request(
      'GET',
      `/products/${symbol}/candles?granularity=${granularity}&start=${start}&end=${end}`
    );
    return data.candles || [];
  }

  async placeOrder(symbol, side, quoteSize, orderType = 'market', limitPrice = null) {
    const orderConfig = orderType === 'market'
      ? { market_market_ioc: { quote_size: quoteSize.toString() } }
      : { limit_limit_gtc: { quote_size: quoteSize.toString(), limit_price: limitPrice.toString(), post_only: false } };

    return this.request('POST', '/orders', {
      client_order_id: `artery-${Date.now()}-${randomBytes(4).toString('hex')}`,
      product_id:      symbol,
      side:            side.toUpperCase(),
      order_configuration: orderConfig,
    });
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
  const apiKey    = process.env.COINBASE_API_KEY;
  const apiSecret = process.env.COINBASE_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('COINBASE_API_KEY and COINBASE_API_SECRET environment variables must be set');
  }

  return new CoinbaseClient({ apiKey, apiSecret });
}

module.exports = { CoinbaseClient, createCoinbaseClient };
