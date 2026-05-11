'use strict';

const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// ── Express mock ─────────────────────────────────────────────────────────────

function makeReq(overrides = {}) {
  return {
    method:  'POST',
    headers: {},
    body:    {},
    query:   {},
    ...overrides,
  };
}

function makeRes() {
  const res = { statusCode: 200, _body: null, _headers: {} };
  res.status    = function (code) { res.statusCode = code; return res; };
  res.json      = function (body) { res._body = body; return res; };
  res.end       = function ()     { return res; };
  res.setHeader = function (k, v) { res._headers[k] = v; return res; };
  return res;
}

// ── Supabase chain mock ───────────────────────────────────────────────────────
//
// Returns a chainable object that is also directly awaitable.
// Terminal async calls: insert(), single(), maybeSingle()
// Chainable (return `this`): select, update, upsert, delete, eq, neq, gte,
//                            limit, order
// Awaiting the chain itself resolves to { data, error, count }.
//
// Tracked call arrays exposed on the chain (for test assertions):
//   _insertCalls   — payloads passed to insert()
//   _updateCalls   — payloads passed to update()
//   _upsertCalls   — payloads passed to upsert()

function makeChain(opts = {}) {
  const _insertCalls = [];
  const _updateCalls = [];
  const _upsertCalls = [];

  const result = {
    data:  opts.data  !== undefined ? opts.data  : [],
    error: opts.error !== undefined ? opts.error : null,
    count: opts.count !== undefined ? opts.count : 0,
  };

  const chain = {
    _insertCalls,
    _updateCalls,
    _upsertCalls,

    // ── Chainable (no-op, return this) ───────────────────────────────────
    select: function ()         { return this; },
    eq:     function ()         { return this; },
    neq:    function ()         { return this; },
    gte:    function ()         { return this; },
    limit:  function ()         { return this; },
    order:  function ()         { return this; },
    delete: function ()         { return this; },

    // ── Chainable + tracking ─────────────────────────────────────────────
    update: function (payload)  { _updateCalls.push(payload); return this; },
    upsert: function (payload)  { _upsertCalls.push(payload); return this; },

    // ── Async terminals ──────────────────────────────────────────────────
    insert: async function (payload) {
      _insertCalls.push(payload);
      return opts.insertResult || { data: null, error: opts.insertError || null };
    },

    single: async function () {
      if (opts.singleResult !== undefined) return opts.singleResult;
      const row = Array.isArray(result.data) ? (result.data[0] || null) : result.data;
      return { data: row, error: result.error };
    },

    maybeSingle: async function () {
      if (opts.maybeSingleResult !== undefined) return opts.maybeSingleResult;
      const row = Array.isArray(result.data) ? (result.data[0] || null) : result.data;
      return { data: row, error: null };
    },

    // ── Awaitable chain (for queries that don't end in a terminal) ───────
    then:  function (resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
    catch: function (fn)              { return Promise.resolve(result).catch(fn); },
  };

  return chain;
}

// Build a full supabase mock.
// `tableConfigs` maps table name → makeChain options; unlisted tables use defaults.
//
// Returns an object shaped exactly like lib/supabase module exports:
//   { supabase: { from }, chains, getAllApplications? }
//
// Pass the whole return value to loadHandler as the 'lib/supabase' mock.
// Access tracked calls via the returned object's `.chains` property.
function makeSupabase(tableConfigs = {}, extras = {}) {
  const chains = {};

  function from(table) {
    if (!chains[table]) {
      chains[table] = makeChain(tableConfigs[table] || {});
    }
    return chains[table];
  }

  return {
    supabase: { from },
    chains,
    ...extras,
  };
}

// ── Require-cache module injection ───────────────────────────────────────────
//
// Injects mock exports into Node's require cache so that when the handler
// is freshly loaded it receives the mocked dependencies.
// Returns the loaded handler function.

function loadHandler(handlerRelPath, mockMap) {
  for (const [relPath, mockExports] of Object.entries(mockMap)) {
    const resolved = require.resolve(path.join(ROOT, relPath));
    require.cache[resolved] = {
      id: resolved, filename: resolved,
      loaded: true, exports: mockExports,
      parent: null, children: [],
    };
  }

  const handlerAbs = require.resolve(path.join(ROOT, handlerRelPath));
  delete require.cache[handlerAbs];

  const handler = require(handlerAbs);
  delete require.cache[handlerAbs];

  return handler;
}

module.exports = { makeReq, makeRes, makeChain, makeSupabase, loadHandler, ROOT };
