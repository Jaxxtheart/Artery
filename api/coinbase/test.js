/**
 * GET /api/coinbase/test
 * Diagnostic endpoint — checks env vars and Coinbase connectivity.
 * Safe to call at any time; never places orders.
 */

const { createHmac, createPrivateKey, randomBytes } = require('crypto');

function decodeJwtParts(jwt) {
  try {
    const [h, p] = jwt.split('.');
    return {
      header:  JSON.parse(Buffer.from(h, 'base64url').toString()),
      payload: JSON.parse(Buffer.from(p, 'base64url').toString()),
    };
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  const apiKey    = process.env.COINBASE_API_KEY    || '';
  const apiSecret = process.env.COINBASE_API_SECRET || '';

  const secretTrimmed = apiSecret.replace(/\\n/g, '\n').trim();
  const secretFormat =
    secretTrimmed.includes('BEGIN EC PRIVATE KEY') ? 'PEM EC (ES256)' :
    secretTrimmed.includes('BEGIN PRIVATE KEY')    ? 'PEM Ed25519 (EdDSA)' :
    secretTrimmed.length > 0                       ? 'Raw base64 (CDP JSON)' : 'NOT SET';

  const secretBytes = secretTrimmed.includes('-----BEGIN')
    ? null
    : Buffer.from(secretTrimmed, 'base64');

  const checks = {
    env: {
      COINBASE_API_KEY:     !!apiKey,
      COINBASE_API_SECRET:  !!apiSecret,
      SUPABASE_URL:         !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      RESEND_API_KEY:       !!process.env.RESEND_API_KEY,
      CRON_SECRET:          !!process.env.CRON_SECRET,
    },
    keyType:      apiKey.includes('/') ? 'CDP (JWT)' : apiKey ? 'Legacy (HMAC)' : 'missing',
    secretFormat,
    secretByteLength: secretBytes ? secretBytes.length : null,
    secretFirstBytesHex: secretBytes ? secretBytes.slice(0, 4).toString('hex') : null,
    jwt: null,
    coinbase: null,
    error: null,
  };

  // Build a sample JWT and decode it so we can inspect what's being sent
  if (apiKey.includes('/') && secretTrimmed) {
    try {
      const { signCDPJWT } = require('../../lib/coinbase/client');
      const jwt = signCDPJWT(apiKey, apiSecret, 'GET', '/accounts');
      checks.jwt = decodeJwtParts(jwt);
    } catch (e) {
      checks.jwt = { error: e.message };
    }
  }

  // Now make the actual API call
  try {
    const { createCoinbaseClient } = require('../../lib/coinbase/client');
    const coinbase = createCoinbaseClient();
    const data = await coinbase.getAccounts();
    checks.coinbase = { ok: true, accountCount: data.accounts?.length ?? 0 };
  } catch (err) {
    checks.coinbase = { ok: false };
    checks.error = err.message;
  }

  const status = checks.coinbase?.ok ? 200 : 500;
  return res.status(status).json({ ok: status === 200, ...checks });
};
