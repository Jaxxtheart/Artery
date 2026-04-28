'use strict';
/**
 * Tests for api/cron/daily-trade.js
 *
 * Key behaviours verified:
 *  1. Auth — 401 without valid CRON_SECRET
 *  2. Bug fix — Coinbase success:false must NOT cause a DB insert
 *  3. Happy path — successful order writes to positions table with correct fields
 *  4. Legacy response — order_id at top level (not inside success_response) still inserts
 *  5. Low confidence — signal below MIN_CONFIDENCE (0.80) is ignored
 */

const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { makeReq, makeRes, makeSupabase, loadHandler } = require('./helpers');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const CRON_SECRET = 'test-cron-secret';

const HIGH_CONF_AVAX = {
  symbol:         'AVAX-USD',
  signal:         'BUY',
  confidence:     0.85,    // above 0.80 MIN_CONFIDENCE
  strategy:       'MOMENTUM',
  price:          9.12,
  reason:         'EMA20>EMA50, RSI:55, MACD+',
  strategy_signal: true,
};

const LOW_CONF_AVAX = { ...HIGH_CONF_AVAX, confidence: 0.60 };  // below 0.65 threshold

const ORDER_SUCCESS = {
  success: true,
  success_response: { order_id: 'cb-order-abc123', product_id: 'AVAX-USD', side: 'BUY' },
};

const ORDER_FAILED = {
  success: false,
  error_response: {
    error:                    'INSUFFICIENT_FUND',
    message:                  'Insufficient fund',
    preview_failure_reason:   'PREVIEW_INSUFFICIENT_FUND',
    new_order_failure_reason: 'UNKNOWN_FAILURE_REASON',
  },
};

// ── Mock builders ─────────────────────────────────────────────────────────────

function buildMocks({ placeOrderResponse, signals = [HIGH_CONF_AVAX], openPositions = [] }) {
  // Coinbase client mock
  const mockCoinbase = {
    getPortfolio:      async () => [{ currency: 'USD', balance: 500, value_usd: 500, type: 'cash' }],
    getProductPrice:   async () => 9.12,
    getProductDetails: async () => ({ base_increment: '0.01' }),
    placeOrder:        async () => placeOrderResponse,
    listOrders:        async () => ({ orders: [] }),
  };

  // Strategies mock — STRATEGY_SYMBOLS must include AVAX-USD
  const strategiesMock = {
    getAllSignals:    async () => signals,
    STRATEGY_SYMBOLS: new Set(['BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD', 'LINK-USD']),
  };

  // Supabase: positions table returns `openPositions` for SELECT queries.
  // makeSupabase returns { supabase: { from }, chains } which mirrors the module
  // exports of lib/supabase — pass it directly to loadHandler.
  const supabaseMock = makeSupabase({ positions: { data: openPositions } });

  // Load a fresh handler with these mocks injected
  const handler = loadHandler('api/cron/daily-trade.js', {
    'lib/coinbase/client':    { createCoinbaseClient: () => mockCoinbase },
    'lib/supabase':           supabaseMock,
    'lib/trading/strategies': strategiesMock,
  });

  return { handler, chains: supabaseMock.chains, mockCoinbase };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('cron: authentication', () => {
  test('returns 401 when Authorization header is missing', async () => {
    const { handler } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });
    const req = makeReq({ method: 'GET', headers: {} });
    const res = makeRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 401);
  });

  test('returns 401 when Authorization header has wrong secret', async () => {
    process.env.CRON_SECRET = CRON_SECRET;
    const { handler } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });
    const req = makeReq({ method: 'GET', headers: { authorization: 'Bearer wrong-secret' } });
    const res = makeRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 401);
  });
});

describe('cron: order success guard (phantom-trade bug fix)', () => {
  beforeEach(() => {
    process.env.CRON_SECRET    = CRON_SECRET;
    process.env.INITIAL_CAPITAL = '1441';
  });

  function authReq() {
    return makeReq({ method: 'GET', headers: { authorization: `Bearer ${CRON_SECRET}` } });
  }

  test('Coinbase success:false — positions.insert is NOT called', async () => {
    const { handler, chains } = buildMocks({ placeOrderResponse: ORDER_FAILED });

    await handler(authReq(), makeRes());

    assert.strictEqual(
      chains.positions._insertCalls.length,
      0,
      'A failed Coinbase order must not produce a DB row',
    );
  });

  test('Coinbase success:false — response reports 0 trades executed', async () => {
    const { handler } = buildMocks({ placeOrderResponse: ORDER_FAILED });
    const res = makeRes();

    await handler(authReq(), res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._body.tradesExecuted, 0);
  });

  test('Coinbase success:true — positions.insert IS called once', async () => {
    const { handler, chains } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });

    await handler(authReq(), makeRes());

    assert.strictEqual(chains.positions._insertCalls.length, 1);
  });

  test('Coinbase success:true — positions row has correct symbol, side, order_id, status', async () => {
    const { handler, chains } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });

    await handler(authReq(), makeRes());

    const row = chains.positions._insertCalls[0];
    assert.strictEqual(row.symbol,             'AVAX-USD');
    assert.strictEqual(row.side,               'BUY');
    assert.strictEqual(row.coinbase_order_id,  'cb-order-abc123');
    assert.strictEqual(row.status,             'OPEN');
    assert.ok(row.stop_loss,  'stop_loss must be set');
    assert.ok(row.take_profit, 'take_profit must be set');
  });

  test('Coinbase success:true — response reports 1 trade executed', async () => {
    const { handler } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });
    const res = makeRes();

    await handler(authReq(), res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._body.tradesExecuted, 1);
  });

  test('legacy order_id at top level (no success_response) still inserts', async () => {
    const legacyResp = { order_id: 'legacy-order-456' };   // some older CB responses
    const { handler, chains } = buildMocks({ placeOrderResponse: legacyResp });

    await handler(authReq(), makeRes());

    assert.strictEqual(chains.positions._insertCalls.length, 1);
    assert.strictEqual(chains.positions._insertCalls[0].coinbase_order_id, 'legacy-order-456');
  });
});

describe('cron: signal filtering', () => {
  beforeEach(() => {
    process.env.CRON_SECRET    = CRON_SECRET;
    process.env.INITIAL_CAPITAL = '1441';
  });

  function authReq() {
    return makeReq({ method: 'GET', headers: { authorization: `Bearer ${CRON_SECRET}` } });
  }

  test('signal below 65% confidence threshold — no order placed, no DB insert', async () => {
    const { handler, chains, mockCoinbase } = buildMocks({
      placeOrderResponse: ORDER_SUCCESS,
      signals: [LOW_CONF_AVAX],
    });

    // Track placeOrder calls
    let placeOrderCalled = false;
    const origPlace = mockCoinbase.placeOrder;
    mockCoinbase.placeOrder = async (...args) => {
      placeOrderCalled = true;
      return origPlace(...args);
    };

    await handler(authReq(), makeRes());

    assert.strictEqual(placeOrderCalled, false, 'placeOrder should not be called for low-confidence signal');
    assert.strictEqual(chains.positions._insertCalls.length, 0);
  });

  test('max 4 open positions reached — no order placed', async () => {
    // Simulate 4 already-open positions
    const fakePositions = [
      { symbol: 'BTC-USD', status: 'OPEN' },
      { symbol: 'ETH-USD', status: 'OPEN' },
      { symbol: 'SOL-USD', status: 'OPEN' },
      { symbol: 'LINK-USD', status: 'OPEN' },
    ];
    const { handler, chains } = buildMocks({
      placeOrderResponse: ORDER_SUCCESS,
      openPositions: fakePositions,
    });

    await handler(authReq(), makeRes());

    assert.strictEqual(chains.positions._insertCalls.length, 0);
  });
});
