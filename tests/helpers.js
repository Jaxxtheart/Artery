'use strict';

const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// ── Express mock ─────────────────────────────────────────────────────────────

function makeReq(overrides = {}) {
  return {
    method:  'POST',
    headers: {},
    body:    {},
    ...overrides,
  };
}

function makeRes() {
  const res = { statusCode: 200, _body: null };
  res.status = function (code) { res.statusCode = code; return res; };
  res.json   = function (body) { res._body = body; return res; };
  res.end    = function ()     { return res; };
  return res;
}

// ── Supabase chain mock ───────────────────────────────────────────────────────
//
// Returns a chainable object that is also directly awaitable.
// Terminal calls (insert, upsert, single) return Promises.
// Chained calls (select, update, eq, gte, limit) return `this`.
// Awaiting the chain itself resolves to { data, error, count }.

function makeChain(opts = {}) {
  const result = {
    data:  opts.data  !== undefined ? opts.data  : [],
    error: opts.error !== undefined ? opts.error : null,
    count: opts.count !== undefined ? opts.count : 0,
  };

  // Track inserts separately so tests can inspect them
  const insertCalls = [];

  const chain = {
    _insertCalls: insertCalls,

    select: function () { return this; },
    update: function () { return this; },
    eq:     function () { return this; },
    gte:    function () { return this; },
    limit:  function () { return this; },

    insert: async function (payload) {
      insertCalls.push(payload);
      return opts.insertResult || { data: null, error: opts.insertError || null };
    },

    upsert: async function () {
      return { data: null, error: null };
    },

    single: async function () {
      return opts.singleResult || { data: null, error: null };
    },

    // Makes the chain directly awaitable (for calls that don't end in insert/single)
    then: function (resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
    catch: function (fn) {
      return Promise.resolve(result).catch(fn);
    },
  };

  return chain;
}

// Build a full supabase mock.
// `tableConfigs` maps table names to makeChain options; unlisted tables use defaults.
//
// Returns an object shaped exactly like the module exports of lib/supabase:
//   { supabase: { from }, chains }
//
// Pass the whole return value to loadHandler as the 'lib/supabase' mock so the
// handler receives the correct { supabase } destructure.  Access chains via the
// returned object's `.chains` property.
function makeSupabase(tableConfigs = {}) {
  const chains = {};

  function from(table) {
    if (!chains[table]) {
      chains[table] = makeChain(tableConfigs[table] || {});
    }
    return chains[table];
  }

  // Shaped like lib/supabase module exports
  return {
    supabase: { from },
    chains,          // extra — ignored by handler, used by tests
  };
}

// ── Require-cache module injection ───────────────────────────────────────────
//
// Injects mock exports into Node's require cache so that when the handler
// is freshly loaded it receives the mocked dependencies.
// Returns the loaded handler function.

function loadHandler(handlerRelPath, mockMap) {
  // Inject each mock into the require cache
  for (const [relPath, mockExports] of Object.entries(mockMap)) {
    const resolved = require.resolve(path.join(ROOT, relPath));
    require.cache[resolved] = {
      id: resolved, filename: resolved,
      loaded: true, exports: mockExports,
      parent: null, children: [],
    };
  }

  // Force-reload the handler so it picks up the fresh mocks
  const handlerAbs = require.resolve(path.join(ROOT, handlerRelPath));
  delete require.cache[handlerAbs];

  const handler = require(handlerAbs);

  // Remove the handler from cache so the next test gets a fresh copy too
  delete require.cache[handlerAbs];

  return handler;
}

module.exports = { makeReq, makeRes, makeChain, makeSupabase, loadHandler, ROOT };
