/**
 * GET /api/coinbase/test
 * Diagnostic endpoint — checks env vars and Coinbase connectivity.
 * Safe to call at any time; never places orders.
 */

const { createCoinbaseClient } = require('../../lib/coinbase/client');

module.exports = async function handler(req, res) {
  const checks = {
    env: {
      COINBASE_API_KEY:    !!process.env.COINBASE_API_KEY,
      COINBASE_API_SECRET: !!process.env.COINBASE_API_SECRET,
      SUPABASE_URL:        !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY:!!process.env.SUPABASE_SERVICE_KEY,
      RESEND_API_KEY:      !!process.env.RESEND_API_KEY,
      CRON_SECRET:         !!process.env.CRON_SECRET,
    },
    keyType: null,
    coinbase: null,
    error: null,
  };

  const apiKey = process.env.COINBASE_API_KEY || '';
  checks.keyType = apiKey.includes('/') ? 'CDP (JWT)' : apiKey ? 'Legacy (HMAC)' : 'missing';

  try {
    const coinbase = createCoinbaseClient();
    // Light call — just fetch accounts list to confirm auth works
    const data = await coinbase.getAccounts();
    checks.coinbase = {
      ok: true,
      accountCount: data.accounts?.length ?? 0,
    };
  } catch (err) {
    checks.coinbase = { ok: false };
    checks.error = err.message;
  }

  const allEnvSet = Object.values(checks.env).every(Boolean);
  const status = checks.coinbase?.ok ? 200 : 500;

  return res.status(status).json({
    ok: status === 200,
    allEnvSet,
    ...checks,
  });
};
