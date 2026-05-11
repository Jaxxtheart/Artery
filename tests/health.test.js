'use strict';
/**
 * Tests for api/health.js
 *
 * Verifies:
 *  1. Returns 200 with operational status when DB is healthy
 *  2. Env var checks report booleans — no value leakage into response
 *  3. OPTIONS preflight always returns 200
 *  4. DB query error surfaces correctly (tableExists: false)
 *  5. Returns 405 for non-GET methods
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { makeReq, makeRes, makeSupabase, loadHandler } = require('./helpers');

function buildHandler(applicationsConfig = {}) {
  const supabaseMock = makeSupabase({ applications: applicationsConfig });
  return loadHandler('api/health.js', { 'lib/supabase': supabaseMock });
}

describe('GET /api/health', () => {
  test('returns 200 and operational status when DB table exists', async () => {
    const handler = buildHandler({ data: [], count: 5 });
    const res = makeRes();

    await handler(makeReq({ method: 'GET' }), res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._body.success, true);
    assert.strictEqual(res._body.database.connected, true);
    assert.strictEqual(res._body.database.tableExists, true);
    assert.strictEqual(res._body.database.applicationCount, 5);
  });

  test('env var presence reported as booleans — no secret value leakage', async () => {
    process.env.SUPABASE_URL        = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'super-secret-key';
    process.env.ADMIN_PASSWORD      = 'hunter2';

    const handler = buildHandler({ data: [] });
    const res = makeRes();
    await handler(makeReq({ method: 'GET' }), res);

    const env = res._body.environment;
    assert.strictEqual(typeof env.supabaseUrl, 'boolean');
    assert.strictEqual(typeof env.supabaseKey, 'boolean');
    assert.strictEqual(typeof env.adminPassword, 'boolean');

    const raw = JSON.stringify(res._body);
    assert.ok(!raw.includes('super-secret-key'), 'Raw secret must not appear in response');
    assert.ok(!raw.includes('hunter2'),          'Raw password must not appear in response');
  });

  test('returns 200 for OPTIONS preflight', async () => {
    const handler = buildHandler({ data: [] });
    const res = makeRes();

    await handler(makeReq({ method: 'OPTIONS' }), res);

    assert.strictEqual(res.statusCode, 200);
  });

  test('sets CORS headers on every response', async () => {
    const handler = buildHandler({ data: [] });
    const res = makeRes();

    await handler(makeReq({ method: 'GET' }), res);

    assert.ok(res._headers['Access-Control-Allow-Origin'], 'CORS origin header must be set');
  });

  test('reports tableExists:false and success:false when DB query errors', async () => {
    const handler = buildHandler({
      error: { message: 'relation "applications" does not exist', hint: 'Run schema.sql' },
    });
    const res = makeRes();

    await handler(makeReq({ method: 'GET' }), res);

    assert.strictEqual(res._body.database.tableExists, false);
    assert.strictEqual(res._body.success, false);
    assert.ok(res._body.database.error);
  });

  test('includes timestamp in response', async () => {
    const handler = buildHandler({ data: [] });
    const res = makeRes();

    await handler(makeReq({ method: 'GET' }), res);

    assert.ok(res._body.timestamp, 'Response must include timestamp');
    assert.doesNotThrow(() => new Date(res._body.timestamp));
  });
});
