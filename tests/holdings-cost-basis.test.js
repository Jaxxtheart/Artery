'use strict';
/**
 * Tests for api/holdings/cost-basis.js
 *
 * Verifies:
 *  1. GET returns all cost-basis entries (no auth)
 *  2. GET returns 503 when Supabase is not configured
 *  3. POST requires auth, validates inputs, upserts to DB
 *  4. DELETE requires auth, validates inputs, removes record
 *  5. Mutations rejected without/with-wrong auth token
 */

const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { makeReq, makeRes, makeSupabase, loadHandler } = require('./helpers');

const ADMIN_PW = 'test-admin-pw';

const SAMPLE_RECORD = { currency: 'ETH', total_spent: 1209.49, notes: 'consolidated buy', updated_at: '2026-05-11T00:00:00Z' };

function buildHandler(tableConfig = {}, withSupabase = true) {
  process.env.ADMIN_PASSWORD = ADMIN_PW;

  const supabaseMock = makeSupabase({ holdings_cost_basis: tableConfig });

  if (!withSupabase) {
    // Simulate missing Supabase (handler checks `if (!supabase)` at top)
    return loadHandler('api/holdings/cost-basis.js', {
      'lib/supabase': { supabase: null, chains: {} },
    });
  }

  return loadHandler('api/holdings/cost-basis.js', { 'lib/supabase': supabaseMock });
}

function authReq(method, body = {}) {
  return makeReq({ method, headers: { authorization: `Bearer ${ADMIN_PW}` }, body });
}

// ── GET ───────────────────────────────────────────────────────────────────────

describe('GET /api/holdings/cost-basis', () => {
  test('returns 200 with all cost-basis entries', async () => {
    const handler = buildHandler({ data: [SAMPLE_RECORD] });
    const res = makeRes();

    await handler(makeReq({ method: 'GET' }), res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._body.success, true);
    assert.strictEqual(res._body.costBases.length, 1);
    assert.strictEqual(res._body.costBases[0].currency, 'ETH');
  });

  test('returns 200 with empty array when no entries exist', async () => {
    const handler = buildHandler({ data: [] });
    const res = makeRes();

    await handler(makeReq({ method: 'GET' }), res);

    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res._body.costBases, []);
  });

  test('returns 503 when Supabase is not configured', async () => {
    const handler = buildHandler({}, false);
    const res = makeRes();

    await handler(makeReq({ method: 'GET' }), res);

    assert.strictEqual(res.statusCode, 503);
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe('POST /api/holdings/cost-basis', () => {
  test('returns 401 without Authorization header', async () => {
    const handler = buildHandler({ singleResult: { data: SAMPLE_RECORD, error: null } });
    const res = makeRes();

    await handler(makeReq({ method: 'POST', headers: {}, body: { currency: 'ETH', total_spent: 1000 } }), res);

    assert.strictEqual(res.statusCode, 401);
  });

  test('returns 401 with wrong password', async () => {
    const handler = buildHandler({ singleResult: { data: SAMPLE_RECORD, error: null } });
    const res = makeRes();

    await handler(makeReq({ method: 'POST', headers: { authorization: 'Bearer wrong' }, body: { currency: 'ETH', total_spent: 1000 } }), res);

    assert.strictEqual(res.statusCode, 401);
  });

  test('returns 400 when currency is missing', async () => {
    const handler = buildHandler({});
    const res = makeRes();

    await handler(authReq('POST', { total_spent: 1000 }), res);

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res._body.error.includes('currency'));
  });

  test('returns 400 when total_spent is missing', async () => {
    const handler = buildHandler({});
    const res = makeRes();

    await handler(authReq('POST', { currency: 'ETH' }), res);

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res._body.error.includes('total_spent'));
  });

  test('upserts currency uppercased to DB', async () => {
    process.env.ADMIN_PASSWORD = ADMIN_PW;
    const supabaseMock = makeSupabase({
      holdings_cost_basis: { singleResult: { data: SAMPLE_RECORD, error: null } },
    });
    const handler = loadHandler('api/holdings/cost-basis.js', { 'lib/supabase': supabaseMock });
    const res = makeRes();

    await handler(authReq('POST', { currency: 'eth', total_spent: 1209.49 }), res);

    assert.strictEqual(res.statusCode, 200);
    const upsertPayload = supabaseMock.chains.holdings_cost_basis._upsertCalls[0];
    assert.strictEqual(upsertPayload.currency, 'ETH', 'currency must be uppercased on upsert');
    assert.strictEqual(upsertPayload.total_spent, 1209.49);
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe('DELETE /api/holdings/cost-basis', () => {
  test('returns 401 without auth', async () => {
    const handler = buildHandler({});
    const res = makeRes();

    await handler(makeReq({ method: 'DELETE', headers: {}, body: { currency: 'ETH' } }), res);

    assert.strictEqual(res.statusCode, 401);
  });

  test('returns 400 when currency is missing', async () => {
    const handler = buildHandler({});
    const res = makeRes();

    await handler(authReq('DELETE', {}), res);

    assert.strictEqual(res.statusCode, 400);
  });

  test('returns 200 on successful delete', async () => {
    const handler = buildHandler({});
    const res = makeRes();

    await handler(authReq('DELETE', { currency: 'ETH' }), res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._body.success, true);
  });

  test('returns 405 for unsupported methods', async () => {
    const handler = buildHandler({});
    const res = makeRes();

    await handler(authReq('PUT', {}), res);

    assert.strictEqual(res.statusCode, 405);
  });
});
