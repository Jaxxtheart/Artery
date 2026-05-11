'use strict';
/**
 * Tests for api/trading/status.js
 *
 * Verifies:
 *  1. Returns 200 with expected portfolio shape
 *  2. Calculates totalPnL against INITIAL_CAPITAL
 *  3. Enriches open positions with live prices from Coinbase
 *  4. Gracefully falls back to snapshot value if Coinbase is unavailable
 *  5. Returns 405 for non-GET methods
 */

const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { makeReq, makeRes, makeSupabase, loadHandler } = require('./helpers');

const OPEN_POSITION = {
  id: 1, symbol: 'ETH-USD', side: 'BUY',
  size: 0.5, entry_price: 2200, strategy: 'MOMENTUM',
  stop_loss: 2090, take_profit: 2640, status: 'OPEN',
  entry_time: new Date(Date.now() - 86_400_000).toISOString(),
};

const LIVE_PORTFOLIO = [
  { currency: 'USD', balance: 207,   value_usd: 207,   type: 'cash' },
  { currency: 'ETH', balance: 0.5,   value_usd: 1200,  price: 2400,  type: 'crypto' },
  { currency: 'BTC', balance: 0.002, value_usd: 190,   price: 95000, type: 'crypto' },
];

function buildHandler({ portfolio = LIVE_PORTFOLIO, positions = [], trades = [], snapshots = [] } = {}) {
  process.env.INITIAL_CAPITAL = '1377';

  const mockCoinbase = { getPortfolio: async () => portfolio };

  const supabaseMock = makeSupabase({
    positions:            { data: positions },
    trade_history:        { data: trades },
    strategy_performance: { data: [] },
    portfolio_snapshots:  { data: snapshots },
  });

  return loadHandler('api/trading/status.js', {
    'lib/coinbase/client':       { createCoinbaseClient: () => mockCoinbase },
    'lib/supabase':              supabaseMock,
    'lib/trading/risk-manager':  require('../lib/trading/risk-manager'),
  });
}

describe('GET /api/trading/status', () => {
  test('returns 200 with correct portfolio shape', async () => {
    const handler = buildHandler();
    const res = makeRes();

    await handler(makeReq({ method: 'GET' }), res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._body.success, true);
    assert.ok('portfolio'          in res._body, 'must include portfolio');
    assert.ok('openPositions'      in res._body, 'must include openPositions');
    assert.ok('recentTrades'       in res._body, 'must include recentTrades');
    assert.ok('riskMetrics'        in res._body, 'must include riskMetrics');
    assert.ok('timestamp'          in res._body, 'must include timestamp');
  });

  test('totalPnL is calculated against INITIAL_CAPITAL env var', async () => {
    process.env.INITIAL_CAPITAL = '1377';
    // Live portfolio total = 207 + 1200 + 190 = 1597
    const handler = buildHandler();
    const res = makeRes();

    await handler(makeReq({ method: 'GET' }), res);

    const { totalValue, initialCapital, totalPnL } = res._body.portfolio;
    assert.strictEqual(initialCapital, 1377);
    assert.ok(Math.abs(totalPnL - (totalValue - 1377)) < 0.01, 'totalPnL must equal totalValue - initialCapital');
  });

  test('enriches open positions with live price and P&L from Coinbase', async () => {
    const handler = buildHandler({ positions: [OPEN_POSITION] });
    const res = makeRes();

    await handler(makeReq({ method: 'GET' }), res);

    const pos = res._body.openPositions[0];
    assert.strictEqual(pos.symbol,        'ETH-USD');
    assert.strictEqual(pos.current_price, 2400);
    // pnl_usd = (2400 - 2200) * 0.5 = 100
    assert.ok(Math.abs(pos.pnl_usd - 100) < 0.01);
  });

  test('falls back to snapshot value when Coinbase is unavailable', async () => {
    const supabaseMock = makeSupabase({
      positions:            { data: [] },
      trade_history:        { data: [] },
      strategy_performance: { data: [] },
      portfolio_snapshots:  { data: [{ total_value: 1300, snapshot_date: '2026-05-10' }] },
    });

    const handler = loadHandler('api/trading/status.js', {
      'lib/coinbase/client': {
        createCoinbaseClient: () => ({
          getPortfolio: async () => { throw new Error('Network error'); },
        }),
      },
      'lib/supabase':             supabaseMock,
      'lib/trading/risk-manager': require('../lib/trading/risk-manager'),
    });

    const res = makeRes();
    await handler(makeReq({ method: 'GET' }), res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._body.portfolio.totalValue, 1300, 'should fall back to snapshot value');
  });

  test('returns 405 for non-GET methods', async () => {
    const handler = buildHandler();
    const res = makeRes();

    await handler(makeReq({ method: 'POST' }), res);

    assert.strictEqual(res.statusCode, 405);
  });

  test('liveAssets includes all portfolio assets', async () => {
    const handler = buildHandler();
    const res = makeRes();

    await handler(makeReq({ method: 'GET' }), res);

    assert.strictEqual(res._body.portfolio.liveAssets.length, LIVE_PORTFOLIO.length);
  });
});
