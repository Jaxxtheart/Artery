'use strict';
/**
 * Tests for api/applications/list.js and api/applications/get.js
 *
 * Note: api/applications/submit.js uses multer for multipart file uploads
 * and an external scoring engine — integration-tested in staging, not here.
 *
 * Verifies:
 *  1. List — returns 401 without auth
 *  2. List — returns application records when authenticated
 *  3. List — OPTIONS preflight returns 200
 *  4. Get  — returns 401 without auth
 *  5. Get  — returns 400 when no id param
 *  6. Get  — returns application when id is found
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { makeReq, makeRes, makeSupabase, loadHandler } = require('./helpers');

const ADMIN_PW = 'test-admin-pw';

const FAKE_APPLICATION = {
  id:          'app-001',
  founderName: 'Jane Doe',
  email:       'jane@startupco.com',
  companyName: 'StartupCo',
  status:      'pending',
  createdAt:   new Date().toISOString(),
  revenue:     '10000',
  users:       '500',
  growth:      '20',
  team:        '3',
  fundingAmount: '50000',
};

// ── List ──────────────────────────────────────────────────────────────────────

describe('GET /api/applications/list', () => {
  function buildListHandler(applications = [FAKE_APPLICATION]) {
    process.env.ADMIN_PASSWORD = ADMIN_PW;

    // list.js imports getAllApplications from lib/supabase
    const supabaseMock = makeSupabase({}, {
      getAllApplications: async () => applications,
    });

    return loadHandler('api/applications/list.js', { 'lib/supabase': supabaseMock });
  }

  test('returns 401 without Authorization header', async () => {
    const handler = buildListHandler();
    const res = makeRes();

    await handler(makeReq({ method: 'GET', headers: {} }), res);

    assert.strictEqual(res.statusCode, 401);
  });

  test('returns 401 with wrong password', async () => {
    const handler = buildListHandler();
    const res = makeRes();

    await handler(makeReq({ method: 'GET', headers: { authorization: 'Bearer wrong' } }), res);

    assert.strictEqual(res.statusCode, 401);
  });

  test('returns 200 with applications when authenticated', async () => {
    const handler = buildListHandler([FAKE_APPLICATION]);
    const res = makeRes();

    await handler(makeReq({ method: 'GET', headers: { authorization: `Bearer ${ADMIN_PW}` } }), res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._body.success, true);
    assert.ok(Array.isArray(res._body.applications), 'applications must be an array');
  });

  test('returns 200 for OPTIONS preflight', async () => {
    const handler = buildListHandler();
    const res = makeRes();

    await handler(makeReq({ method: 'OPTIONS' }), res);

    assert.strictEqual(res.statusCode, 200);
  });

  test('returns 405 for non-GET, non-OPTIONS methods', async () => {
    const handler = buildListHandler();
    const res = makeRes();

    await handler(makeReq({ method: 'POST', headers: { authorization: `Bearer ${ADMIN_PW}` } }), res);

    assert.strictEqual(res.statusCode, 405);
  });
});

// ── Get ───────────────────────────────────────────────────────────────────────

describe('GET /api/applications/get', () => {
  function buildGetHandler(application = FAKE_APPLICATION) {
    process.env.ADMIN_PASSWORD = ADMIN_PW;

    const supabaseMock = makeSupabase({}, {
      getApplication: async () => application,
    });

    return loadHandler('api/applications/get.js', { 'lib/supabase': supabaseMock });
  }

  test('returns 401 without Authorization header', async () => {
    const handler = buildGetHandler();
    const res = makeRes();

    await handler(makeReq({ method: 'GET', headers: {}, query: { id: 'app-001' } }), res);

    assert.strictEqual(res.statusCode, 401);
  });

  test('returns 400 when id query param is missing', async () => {
    const handler = buildGetHandler();
    const res = makeRes();

    // query is normally parsed by Vercel; simulate empty query
    await handler(
      makeReq({ method: 'GET', headers: { authorization: `Bearer ${ADMIN_PW}` }, query: {} }),
      res,
    );

    assert.strictEqual(res.statusCode, 400);
  });

  test('returns 200 with application when authenticated and id provided', async () => {
    const handler = buildGetHandler(FAKE_APPLICATION);
    const res = makeRes();

    await handler(
      makeReq({ method: 'GET', headers: { authorization: `Bearer ${ADMIN_PW}` }, query: { id: 'app-001' } }),
      res,
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._body.success, true);
    assert.ok(res._body.application, 'application must be present in response');
  });
});
