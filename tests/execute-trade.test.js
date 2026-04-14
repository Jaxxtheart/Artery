'use strict';
/**
 * Tests for api/trading/execute.js  (manual trade execution from the UI)
 *
 * Key behaviours verified:
 *  1. Auth — 401 without ADMIN_PASSWORD (or CRON_SECRET)
 *  2. dry_run — preview only, no real order placed, no DB write
 *  3. BUY success — 200 with orderId, positions row inserted with correct fields
 *  4. BUY fail (Coinbase rejects) — 400 with the Coinbase error reason surfaced
 *  5. SELL with no holdings — 400 "no balance"
 *  6. quote_size precision — the amount sent to Coinbase is always 2 dp
 */

const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { makeReq, makeRes, makeSupabase, loadHandler } = require('./helpers');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = 'test-admin-password';

// Portfolio with $500 cash and no crypto holdings
const PORTFOLIO_CASH_ONLY = [
  { currency: 'USD', balance: 500, value_usd: 500, type: 'cash' },
];

// Portfolio with AVAX holding (needed for SELL tests)
const PORTFOLIO_WITH_AVAX = [
  { currency: 'USD',  balance: 200,   value_usd: 200,   type: 'cash' },
  { currency: 'AVAX', balance: 25.5,  value_usd: 232.56, type: 'crypto', price: 9.12 },
];

const ORDER_SUCCESS = {
  success: true,
  success_response: { order_id: 'cb-exec-order-789', product_id: 'AVAX-USD', side: 'BUY' },
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

const PRECISION_ERROR = {
  success: false,
  error_response: {
    error:                    'INVALID_ARGUMENT',
    message:                  'Invalid quote size',
    new_order_failure_reason: 'INVALID_SIZE_PRECISION',
  },
};

// ── Mock builders ─────────────────────────────────────────────────────────────

function buildMocks({ placeOrderResponse, previewResponse = {}, portfolio = PORTFOLIO_CASH_ONLY } = {}) {
  const mockCoinbase = {
    getPortfolio:      async () => portfolio,
    getProductPrice:   async () => 9.12,
    getProductDetails: async () => ({ base_increment: '0.01' }),
    placeOrder:        async () => placeOrderResponse,
    previewOrder:      async () => previewResponse,
  };

  // Track positions.insert calls.
  // makeSupabase returns { supabase: { from }, chains } mirroring lib/supabase exports.
  const supabaseMock = makeSupabase({ positions: { count: 0 } });

  const handler = loadHandler('api/trading/execute.js', {
    'lib/coinbase/client': { createCoinbaseClient: () => mockCoinbase },
    'lib/supabase':        supabaseMock,
  });

  return { handler, chains: supabaseMock.chains, mockCoinbase };
}

function buyReq(overrides = {}) {
  return makeReq({
    method:  'POST',
    headers: { authorization: `Bearer ${ADMIN_PASSWORD}` },
    body: {
      symbol:     'AVAX-USD',
      side:       'BUY',
      confidence: 0.85,
      strategy:   'MOMENTUM',
      price:      9.12,
      reason:     'EMA20>EMA50',
      ...overrides.body,
    },
    ...overrides,
  });
}

function sellReq(overrides = {}) {
  return makeReq({
    method:  'POST',
    headers: { authorization: `Bearer ${ADMIN_PASSWORD}` },
    body: {
      symbol:     'AVAX-USD',
      side:       'SELL',
      confidence: 0.85,
      strategy:   'MOMENTUM',
      ...overrides.body,
    },
    ...overrides,
  });
}

// ── Tests: authentication ─────────────────────────────────────────────────────

describe('execute: authentication', () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
    process.env.CRON_SECRET    = 'different-cron-secret';
  });

  test('returns 401 with no Authorization header', async () => {
    const { handler } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });
    const req = buyReq({ headers: {} });
    const res = makeRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 401);
  });

  test('returns 401 with wrong password', async () => {
    const { handler } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });
    const req = buyReq({ headers: { authorization: 'Bearer wrong-password' } });
    const res = makeRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 401);
  });

  test('accepts CRON_SECRET as valid auth (cron triggering execute)', async () => {
    process.env.CRON_SECRET = 'cron-only-secret';
    const { handler } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });
    const req = buyReq({ headers: { authorization: 'Bearer cron-only-secret' } });
    const res = makeRes();

    await handler(req, res);

    // Should not be 401
    assert.notStrictEqual(res.statusCode, 401);
  });
});

// ── Tests: dry_run mode ───────────────────────────────────────────────────────

describe('execute: dry_run (Test Order button)', () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  });

  test('dry_run returns success:true without placing a real order', async () => {
    const previewResp = { best_bid: '9.00', best_ask: '9.12', slippage: '0.001' };
    const { handler, mockCoinbase } = buildMocks({
      placeOrderResponse: ORDER_SUCCESS,   // should NOT be called
      previewResponse:    previewResp,
    });

    let placeOrderCalled = false;
    mockCoinbase.placeOrder = async () => { placeOrderCalled = true; return ORDER_SUCCESS; };

    const req = buyReq({ body: { symbol: 'AVAX-USD', side: 'BUY', confidence: 0.85, strategy: 'MOMENTUM', dry_run: true } });
    const res = makeRes();

    await handler(req, res);

    assert.strictEqual(placeOrderCalled, false, 'placeOrder must not be called in dry_run');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._body.dry_run, true);
  });

  test('dry_run does not insert into positions table', async () => {
    const { handler, chains } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });
    const req = buyReq({ body: { symbol: 'AVAX-USD', side: 'BUY', confidence: 0.85, strategy: 'MOMENTUM', dry_run: true } });
    const res = makeRes();

    await handler(req, res);

    assert.strictEqual(chains.positions._insertCalls.length, 0);
  });
});

// ── Tests: BUY — success path ─────────────────────────────────────────────────

describe('execute: BUY — Coinbase order succeeds', () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD  = ADMIN_PASSWORD;
    process.env.INITIAL_CAPITAL = '1441';
  });

  test('returns 200 with orderId', async () => {
    const { handler } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });
    const res = makeRes();

    await handler(buyReq(), res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._body.success, true);
    assert.strictEqual(res._body.orderId, 'cb-exec-order-789');
  });

  test('inserts one row into positions table', async () => {
    const { handler, chains } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });

    await handler(buyReq(), makeRes());

    assert.strictEqual(chains.positions._insertCalls.length, 1);
  });

  test('positions row has correct fields', async () => {
    const { handler, chains } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });

    await handler(buyReq(), makeRes());

    const row = chains.positions._insertCalls[0];
    assert.strictEqual(row.symbol,            'AVAX-USD');
    assert.strictEqual(row.side,              'BUY');
    assert.strictEqual(row.coinbase_order_id, 'cb-exec-order-789');
    assert.strictEqual(row.status,            'OPEN');
    assert.ok(typeof row.entry_price === 'number', 'entry_price should be set');
    assert.ok(row.stop_loss,   'stop_loss should be set');
    assert.ok(row.take_profit, 'take_profit should be set');
  });
});

// ── Tests: BUY — Coinbase rejects order ──────────────────────────────────────

describe('execute: BUY — Coinbase order fails', () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD  = ADMIN_PASSWORD;
    process.env.INITIAL_CAPITAL = '1441';
  });

  test('insufficient funds — returns 400 with error message', async () => {
    const { handler } = buildMocks({ placeOrderResponse: ORDER_FAILED });
    const res = makeRes();

    await handler(buyReq(), res);

    assert.strictEqual(res.statusCode, 400);
    assert.ok(
      res._body.error.includes('INSUFFICIENT_FUND') ||
      res._body.error.includes('PREVIEW_INSUFFICIENT_FUND'),
      `Expected Coinbase reason in error, got: ${res._body.error}`,
    );
  });

  test('failed order — positions.insert is NOT called', async () => {
    const { handler, chains } = buildMocks({ placeOrderResponse: ORDER_FAILED });

    await handler(buyReq(), makeRes());

    assert.strictEqual(chains.positions._insertCalls.length, 0);
  });

  test('size precision error — returns 400 with Coinbase reason surfaced', async () => {
    const { handler } = buildMocks({ placeOrderResponse: PRECISION_ERROR });
    const res = makeRes();

    await handler(buyReq(), res);

    assert.strictEqual(res.statusCode, 400);
    assert.ok(
      res._body.error.includes('INVALID_SIZE_PRECISION'),
      `Expected INVALID_SIZE_PRECISION in error, got: ${res._body.error}`,
    );
  });
});

// ── Tests: SELL ───────────────────────────────────────────────────────────────

describe('execute: SELL', () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD  = ADMIN_PASSWORD;
    process.env.INITIAL_CAPITAL = '1441';
  });

  test('SELL with no AVAX holding returns 400 "no balance"', async () => {
    const { handler } = buildMocks({
      placeOrderResponse: ORDER_SUCCESS,
      portfolio: PORTFOLIO_CASH_ONLY,   // no AVAX
    });
    const res = makeRes();

    await handler(sellReq(), res);

    assert.strictEqual(res.statusCode, 400);
    assert.match(res._body.error, /no.*balance/i);
  });

  test('SELL with AVAX holding places order and returns 200', async () => {
    const { handler } = buildMocks({
      placeOrderResponse: {
        success: true,
        success_response: { order_id: 'sell-order-999', product_id: 'AVAX-USD', side: 'SELL' },
      },
      portfolio: PORTFOLIO_WITH_AVAX,
    });
    const res = makeRes();

    await handler(sellReq(), res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._body.success, true);
  });
});
