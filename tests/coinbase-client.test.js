'use strict';

const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');

const { CoinbaseClient } = require('../lib/coinbase/client');

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeClient() {
  // Credentials don't matter — we replace client.request in every test
  return new CoinbaseClient({ apiKey: 'test-key', apiSecret: 'test-secret' });
}

const SUCCESS_RESPONSE = {
  success: true,
  success_response: { order_id: 'cb-order-123', product_id: 'AVAX-USD', side: 'BUY' },
};

// ── placeOrder: quote_size precision ────────────────────────────────────────

describe('CoinbaseClient.placeOrder — quote_size precision', () => {
  let client;

  beforeEach(() => {
    client = makeClient();
    client.request = mock.fn(async () => SUCCESS_RESPONSE);
  });

  test('integer USD amount formats to 2 decimal places', async () => {
    await client.placeOrder('AVAX-USD', 'BUY', 50);

    const body = client.request.mock.calls[0].arguments[2];
    assert.strictEqual(
      body.order_configuration.market_market_ioc.quote_size,
      '50.00',
    );
  });

  test('float with 4+ dp is rounded to 2 dp (prevents INVALID_SIZE_PRECISION)', async () => {
    // calculatePositionSize(1441.33, 0.85, 0) → 360.3325
    await client.placeOrder('AVAX-USD', 'BUY', 360.3325);

    const body = client.request.mock.calls[0].arguments[2];
    assert.strictEqual(
      body.order_configuration.market_market_ioc.quote_size,
      '360.33',
    );
  });

  test('3-dp position size is clamped to exactly 2 dp', async () => {
    // 1440.78 * 0.25 produces 360.195 (3 decimal places).
    // IEEE 754 stores this as ≈360.194999… so toFixed(2) → "360.19".
    // The important thing is the value sent is 2 dp, not 3 dp ("360.195").
    await client.placeOrder('AVAX-USD', 'BUY', 360.195);

    const body = client.request.mock.calls[0].arguments[2];
    const qs = body.order_configuration.market_market_ioc.quote_size;
    assert.match(qs, /^\d+\.\d{2}$/, `quote_size must have exactly 2 dp, got "${qs}"`);
  });

  test('already-rounded value is unchanged', async () => {
    await client.placeOrder('BTC-USD', 'BUY', 125.50);

    const body = client.request.mock.calls[0].arguments[2];
    assert.strictEqual(
      body.order_configuration.market_market_ioc.quote_size,
      '125.50',
    );
  });
});

// ── placeOrder: SELL uses base_size unchanged ───────────────────────────────

describe('CoinbaseClient.placeOrder — SELL base_size', () => {
  let client;

  beforeEach(() => {
    client = makeClient();
    client.request = mock.fn(async () => SUCCESS_RESPONSE);
  });

  test('SELL sends base_size as-is (crypto units, not rounded to 2 dp)', async () => {
    await client.placeOrder('AVAX-USD', 'SELL', 10.98765432);

    const body = client.request.mock.calls[0].arguments[2];
    assert.strictEqual(
      body.order_configuration.market_market_ioc.base_size,
      '10.98765432',
    );
    assert.ok(
      !('quote_size' in body.order_configuration.market_market_ioc),
      'SELL should not have quote_size',
    );
  });
});

// ── placeOrder: request structure ───────────────────────────────────────────

describe('CoinbaseClient.placeOrder — request structure', () => {
  let client;

  beforeEach(() => {
    client = makeClient();
    client.request = mock.fn(async () => SUCCESS_RESPONSE);
  });

  test('BUY sends correct method, path, product_id, and side', async () => {
    await client.placeOrder('AVAX-USD', 'BUY', 100);

    const [method, path, body] = client.request.mock.calls[0].arguments;
    assert.strictEqual(method, 'POST');
    assert.strictEqual(path, '/orders');
    assert.strictEqual(body.product_id, 'AVAX-USD');
    assert.strictEqual(body.side, 'BUY');
    assert.match(body.client_order_id, /^artery-/);
  });

  test('side is uppercased regardless of input case', async () => {
    await client.placeOrder('AVAX-USD', 'buy', 100);

    const body = client.request.mock.calls[0].arguments[2];
    assert.strictEqual(body.side, 'BUY');
  });

  test('returns raw Coinbase response', async () => {
    const result = await client.placeOrder('AVAX-USD', 'BUY', 100);
    assert.deepStrictEqual(result, SUCCESS_RESPONSE);
  });
});
