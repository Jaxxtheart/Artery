'use strict';
/**
 * Tests for api/trading/positions.js
 *
 * Verifies:
 *  1. GET returns open positions from DB
 *  2. DELETE auth guard (401 without token)
 *  3. Phantom-sell bug fix — Coinbase failure must NOT update DB
 *  4. Successful close updates position to CLOSED and inserts trade_history
 *  5. SELL size is in crypto units (base_size), not USD
 *  6. Error response contains Coinbase failure reason
 */

const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { makeReq, makeRes, makeSupabase, loadHandler } = require('./helpers');

const ADMIN_PW = 'test-admin-pw';

const FAKE_POSITION = {
  id:          42,
  symbol:      'BTC-USD',
  side:        'BUY',
  size:        0.001,            // crypto units
  entry_price: 95000,
  strategy:    'MOMENTUM',
  entry_time:  new Date(Date.now() - 3_600_000).toISOString(),
};

const ORDER_SUCCESS = { success: true,  success_response: { order_id: 'sell-abc-123', product_id: 'BTC-USD', side: 'SELL' } };
const ORDER_FAILED  = { success: false, error_response:   { error: 'INSUFFICIENT_FUND', message: 'Insufficient fund' } };

function buildMocks({ placeOrderResponse, position = FAKE_POSITION } = {}) {
  process.env.ADMIN_PASSWORD = ADMIN_PW;

  const mockCoinbase = {
    getProductPrice:   async () => 97_000,
    getProductDetails: async () => ({ base_increment: '0.00001' }),
    placeOrder:        async () => placeOrderResponse,
  };

  const supabaseMock = makeSupabase({
    positions:     { singleResult: { data: position, error: null } },
    trade_history: {},
  });

  const handler = loadHandler('api/trading/positions.js', {
    'lib/coinbase/client': { createCoinbaseClient: () => mockCoinbase },
    'lib/supabase':        supabaseMock,
  });

  return { handler, chains: supabaseMock.chains, mockCoinbase };
}

function authReq(body = {}) {
  return makeReq({ method: 'DELETE', headers: { authorization: `Bearer ${ADMIN_PW}` }, body });
}

// ── GET ───────────────────────────────────────────────────────────────────────

describe('GET /api/trading/positions', () => {
  test('returns 200 with open positions array', async () => {
    const supabaseMock = makeSupabase({ positions: { data: [FAKE_POSITION] } });
    const handler = loadHandler('api/trading/positions.js', {
      'lib/coinbase/client': { createCoinbaseClient: () => ({}) },
      'lib/supabase':        supabaseMock,
    });

    const res = makeRes();
    await handler(makeReq({ method: 'GET' }), res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._body.success, true);
    assert.strictEqual(res._body.positions.length, 1);
    assert.strictEqual(res._body.positions[0].symbol, 'BTC-USD');
  });

  test('returns empty array when no open positions', async () => {
    const supabaseMock = makeSupabase({ positions: { data: [] } });
    const handler = loadHandler('api/trading/positions.js', {
      'lib/coinbase/client': { createCoinbaseClient: () => ({}) },
      'lib/supabase':        supabaseMock,
    });

    const res = makeRes();
    await handler(makeReq({ method: 'GET' }), res);

    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res._body.positions, []);
  });
});

// ── DELETE — auth ─────────────────────────────────────────────────────────────

describe('DELETE /api/trading/positions — authentication', () => {
  test('returns 401 with no Authorization header', async () => {
    const { handler } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });
    const res = makeRes();

    await handler(makeReq({ method: 'DELETE', headers: {}, body: { positionId: 42 } }), res);

    assert.strictEqual(res.statusCode, 401);
  });

  test('returns 401 with wrong password', async () => {
    const { handler } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });
    const res = makeRes();

    await handler(
      makeReq({ method: 'DELETE', headers: { authorization: 'Bearer wrong' }, body: { positionId: 42 } }),
      res,
    );

    assert.strictEqual(res.statusCode, 401);
  });
});

// ── DELETE — phantom-sell bug fix ─────────────────────────────────────────────

describe('DELETE /api/trading/positions — phantom-sell bug fix', () => {
  test('Coinbase SELL fails — position NOT marked CLOSED in DB', async () => {
    const { handler, chains } = buildMocks({ placeOrderResponse: ORDER_FAILED });

    await handler(authReq({ positionId: 42 }), makeRes());

    assert.strictEqual(
      chains.positions._updateCalls.length, 0,
      'DB must NOT be updated when Coinbase rejects the SELL',
    );
  });

  test('Coinbase SELL fails — trade_history NOT written', async () => {
    const { handler, chains } = buildMocks({ placeOrderResponse: ORDER_FAILED });

    await handler(authReq({ positionId: 42 }), makeRes());

    assert.strictEqual((chains.trade_history?._insertCalls?.length ?? 0), 0);
  });

  test('Coinbase SELL fails — response is 400 with Coinbase reason surfaced', async () => {
    const { handler } = buildMocks({ placeOrderResponse: ORDER_FAILED });
    const res = makeRes();

    await handler(authReq({ positionId: 42 }), res);

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res._body.error.includes('Coinbase order failed'),
      `Expected "Coinbase order failed" in error message, got: ${res._body.error}`);
  });

  test('Coinbase SELL succeeds — position IS marked CLOSED', async () => {
    const { handler, chains } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });

    await handler(authReq({ positionId: 42 }), makeRes());

    assert.strictEqual(chains.positions._updateCalls.length, 1);
    assert.strictEqual(chains.positions._updateCalls[0].status, 'CLOSED');
  });

  test('Coinbase SELL succeeds — exit_price and P&L recorded on position', async () => {
    const { handler, chains } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });

    await handler(authReq({ positionId: 42 }), makeRes());

    const update = chains.positions._updateCalls[0];
    assert.ok(typeof update.exit_price === 'number', 'exit_price must be a number');
    assert.ok(typeof update.pnl_usd === 'number',    'pnl_usd must be a number');
    assert.ok(typeof update.pnl_pct === 'number',    'pnl_pct must be a number');
  });

  test('Coinbase SELL succeeds — trade_history row inserted', async () => {
    const { handler, chains } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });

    await handler(authReq({ positionId: 42 }), makeRes());

    assert.strictEqual(chains.trade_history._insertCalls.length, 1);
    const row = chains.trade_history._insertCalls[0];
    assert.strictEqual(row.symbol, 'BTC-USD');
    assert.ok(typeof row.pnl_usd === 'number');
  });

  test('SELL size sent to Coinbase is crypto units, NOT USD (core bug fix)', async () => {
    let capturedSize = null;

    process.env.ADMIN_PASSWORD = ADMIN_PW;
    const supabaseMock = makeSupabase({
      positions:     { singleResult: { data: FAKE_POSITION, error: null } },
      trade_history: {},
    });

    const handler = loadHandler('api/trading/positions.js', {
      'lib/coinbase/client': {
        createCoinbaseClient: () => ({
          getProductPrice:   async () => 97_000,
          getProductDetails: async () => ({ base_increment: '0.00001' }),
          placeOrder: async (_sym, _side, size) => {
            capturedSize = size;
            return ORDER_SUCCESS;
          },
        }),
      },
      'lib/supabase': supabaseMock,
    });

    await handler(authReq({ positionId: 42 }), makeRes());

    // position.size = 0.001 BTC; sizeUSD would be ~$97 — must be the small number
    assert.ok(capturedSize !== null,  'placeOrder must have been called');
    assert.ok(capturedSize < 1,
      `SELL size must be crypto units (~0.001), got ${capturedSize} — looks like USD was sent instead`);
    assert.ok(capturedSize > 0, 'SELL size must be positive');
  });

  test('Coinbase SELL succeeds — response 200 with P&L message', async () => {
    const { handler } = buildMocks({ placeOrderResponse: ORDER_SUCCESS });
    const res = makeRes();

    await handler(authReq({ positionId: 42 }), res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._body.success, true);
    assert.ok(typeof res._body.message === 'string');
  });
});
