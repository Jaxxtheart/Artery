'use strict';
/**
 * Tests for api/trading/signals.js
 *
 * Verifies:
 *  1. Returns 200 with signals array and metadata
 *  2. Suppresses signals for symbols sold within the 4h cooldown window
 *  3. Persists actionable (non-HOLD) signals to the signals table
 *  4. Returns 405 for non-GET methods
 *  5. Gracefully handles Coinbase portfolio fetch failure (falls back to monitored list)
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { makeReq, makeRes, makeSupabase, loadHandler } = require('./helpers');

const ETH_BUY  = { symbol: 'ETH-USD', signal: 'BUY',  confidence: 0.82, strategy: 'MOMENTUM',      price: 2400, reason: 'EMA cross', atr: 60 };
const BTC_BUY  = { symbol: 'BTC-USD', signal: 'BUY',  confidence: 0.75, strategy: 'MEAN_REVERSION', price: 95000, reason: 'Oversold', atr: 1800 };
const ETH_HOLD = { symbol: 'ETH-USD', signal: 'HOLD', confidence: 0,    strategy: 'MOMENTUM',      price: 2400, reason: 'No setup', atr: null };

function buildHandler({ signals = [ETH_BUY, BTC_BUY], recentSells = [], portfolioThrows = false } = {}) {
  const mockCoinbase = {
    getPortfolio: portfolioThrows
      ? async () => { throw new Error('Coinbase unavailable'); }
      : async () => [{ currency: 'ETH', balance: 0.5, value_usd: 1200, type: 'crypto' }],
  };

  const strategiesMock = { getAllSignals: async () => signals };

  const supabaseMock = makeSupabase({
    trade_history: { data: recentSells },
    signals:       {},
  });

  return {
    handler: loadHandler('api/trading/signals.js', {
      'lib/coinbase/client':    { createCoinbaseClient: () => mockCoinbase },
      'lib/trading/strategies': strategiesMock,
      'lib/supabase':           supabaseMock,
    }),
    chains: supabaseMock.chains,
  };
}

describe('GET /api/trading/signals', () => {
  test('returns 200 with signals array and metadata fields', async () => {
    const { handler } = buildHandler();
    const res = makeRes();

    await handler(makeReq({ method: 'GET' }), res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._body.success, true);
    assert.ok(Array.isArray(res._body.signals),          'signals must be an array');
    assert.ok(typeof res._body.count === 'number',       'count must be a number');
    assert.ok(typeof res._body.actionable === 'number',  'actionable must be a number');
    assert.ok(Array.isArray(res._body.suppressedSymbols),'suppressedSymbols must be an array');
    assert.ok(res._body.generatedAt,                     'generatedAt must be present');
  });

  test('suppresses signals for symbols sold in the last 4 hours (cooldown)', async () => {
    const { handler } = buildHandler({
      signals:     [ETH_BUY, BTC_BUY],
      recentSells: [{ symbol: 'ETH-USD' }],   // ETH sold recently
    });
    const res = makeRes();

    await handler(makeReq({ method: 'GET' }), res);

    const ethSignal = res._body.signals.find(s => s.symbol === 'ETH-USD');
    const btcSignal = res._body.signals.find(s => s.symbol === 'BTC-USD');

    assert.ok(!ethSignal, 'ETH signal must be suppressed due to 4h cooldown');
    assert.ok(btcSignal,  'BTC signal must pass through');
    assert.ok(res._body.suppressedSymbols.includes('ETH-USD'));
  });

  test('persists actionable BUY/SELL signals to signals table', async () => {
    const { handler, chains } = buildHandler({ signals: [ETH_BUY, BTC_BUY] });

    await handler(makeReq({ method: 'GET' }), makeRes());

    assert.strictEqual(chains.signals._insertCalls.length, 1, 'should insert once (array batch)');
    const inserted = chains.signals._insertCalls[0];
    assert.ok(Array.isArray(inserted), 'insert payload must be an array');
    assert.strictEqual(inserted.length, 2, 'both BUY signals must be inserted');
    assert.ok(inserted.every(s => s.executed === false), 'all signals must be inserted as not executed');
  });

  test('does NOT insert HOLD signals to DB', async () => {
    const { handler, chains } = buildHandler({ signals: [ETH_HOLD] });

    await handler(makeReq({ method: 'GET' }), makeRes());

    // No actionable signals → from('signals') never called, chain never instantiated
    assert.strictEqual((chains.signals?._insertCalls?.length ?? 0), 0);
  });

  test('continues with monitored list when Coinbase portfolio fetch fails', async () => {
    const { handler } = buildHandler({ portfolioThrows: true });
    const res = makeRes();

    await handler(makeReq({ method: 'GET' }), res);

    assert.strictEqual(res.statusCode, 200, 'should still return 200 when Coinbase portfolio fails');
  });

  test('returns 405 for non-GET methods', async () => {
    const { handler } = buildHandler();
    const res = makeRes();

    await handler(makeReq({ method: 'POST' }), res);

    assert.strictEqual(res.statusCode, 405);
  });

  test('actionable count matches non-HOLD signals', async () => {
    const { handler } = buildHandler({ signals: [ETH_BUY, BTC_BUY, ETH_HOLD] });
    const res = makeRes();

    await handler(makeReq({ method: 'GET' }), res);

    assert.strictEqual(res._body.actionable, 2);
    assert.strictEqual(res._body.count, 3);
  });
});
