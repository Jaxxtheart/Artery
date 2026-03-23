/**
 * GET /api/coinbase/test
 * Diagnostic endpoint — checks env vars and Coinbase connectivity.
 */

const { createPrivateKey, createPublicKey } = require('crypto');

const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const SEC1_P256_PREFIX     = Buffer.from('30310201010420', 'hex');
const SEC1_P256_SUFFIX     = Buffer.from('a00a06082a8648ce3d030107', 'hex');

function decodeJwtParts(jwt) {
  try {
    const [h, p] = jwt.split('.');
    return {
      header:  JSON.parse(Buffer.from(h, 'base64url').toString()),
      payload: JSON.parse(Buffer.from(p, 'base64url').toString()),
    };
  } catch { return null; }
}

// Try to figure out which half of the raw 64-byte key is the actual private scalar/seed
// by deriving the public key and checking if it matches the OTHER half.
function detectKeyFormat(keyBytes) {
  const result = {};

  // ── Ed25519: try first 32 bytes as seed ──
  try {
    const seed = keyBytes.slice(0, 32);
    const priv = createPrivateKey({ key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]), format: 'der', type: 'pkcs8' });
    const pubDer = createPublicKey(priv).export({ format: 'der', type: 'spki' });
    const derivedPub = pubDer.slice(-32); // last 32 bytes of SPKI are the raw Ed25519 public key
    result.ed25519_first32_derivedPub = derivedPub.toString('hex');
    result.ed25519_first32_matchesLast32 = derivedPub.equals(keyBytes.slice(32, 64));
  } catch (e) { result.ed25519_first32_error = e.message; }

  // ── Ed25519: try last 32 bytes as seed ──
  try {
    const seed = keyBytes.slice(32, 64);
    const priv = createPrivateKey({ key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]), format: 'der', type: 'pkcs8' });
    const pubDer = createPublicKey(priv).export({ format: 'der', type: 'spki' });
    const derivedPub = pubDer.slice(-32);
    result.ed25519_last32_derivedPub = derivedPub.toString('hex');
    result.ed25519_last32_matchesFirst32 = derivedPub.equals(keyBytes.slice(0, 32));
  } catch (e) { result.ed25519_last32_error = e.message; }

  // ── P-256: try first 32 bytes as scalar ──
  try {
    const scalar = keyBytes.slice(0, 32);
    const sec1 = Buffer.concat([SEC1_P256_PREFIX, scalar, SEC1_P256_SUFFIX]);
    const priv = createPrivateKey({ key: sec1, format: 'der', type: 'sec1' });
    const jwk = createPublicKey(priv).export({ format: 'jwk' });
    const x = Buffer.from(jwk.x, 'base64url');
    const y = Buffer.from(jwk.y, 'base64url');
    result.p256_first32_x = x.toString('hex');
    result.p256_first32_y = y.toString('hex');
    result.p256_first32_last32isX = x.equals(keyBytes.slice(32, 64));
    result.p256_first32_last32isY = y.equals(keyBytes.slice(32, 64));
  } catch (e) { result.p256_first32_error = e.message; }

  // ── P-256: try last 32 bytes as scalar ──
  try {
    const scalar = keyBytes.slice(32, 64);
    const sec1 = Buffer.concat([SEC1_P256_PREFIX, scalar, SEC1_P256_SUFFIX]);
    const priv = createPrivateKey({ key: sec1, format: 'der', type: 'sec1' });
    const jwk = createPublicKey(priv).export({ format: 'jwk' });
    const x = Buffer.from(jwk.x, 'base64url');
    const y = Buffer.from(jwk.y, 'base64url');
    result.p256_last32_x = x.toString('hex');
    result.p256_last32_y = y.toString('hex');
    result.p256_last32_first32isX = x.equals(keyBytes.slice(0, 32));
    result.p256_last32_first32isY = y.equals(keyBytes.slice(0, 32));
  } catch (e) { result.p256_last32_error = e.message; }

  return result;
}

module.exports = async function handler(req, res) {
  const apiKey    = process.env.COINBASE_API_KEY    || '';
  const apiSecret = process.env.COINBASE_API_SECRET || '';
  const secretTrimmed = apiSecret.replace(/\\n/g, '\n').trim();

  const isRaw = !secretTrimmed.includes('-----BEGIN');
  const secretBytes = isRaw ? Buffer.from(secretTrimmed, 'base64') : null;

  const secretFormat =
    secretTrimmed.includes('BEGIN EC PRIVATE KEY') ? 'PEM EC (ES256)' :
    secretTrimmed.includes('BEGIN PRIVATE KEY')    ? 'PEM Ed25519 (EdDSA)' :
    secretTrimmed.length > 0                       ? 'Raw base64 (CDP JSON)' : 'NOT SET';

  const checks = {
    env: {
      COINBASE_API_KEY:     !!apiKey,
      COINBASE_API_SECRET:  !!apiSecret,
      SUPABASE_URL:         !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      RESEND_API_KEY:       !!process.env.RESEND_API_KEY,
      CRON_SECRET:          !!process.env.CRON_SECRET,
    },
    keyType:             apiKey.includes('/') ? 'CDP (JWT)' : apiKey ? 'Legacy (HMAC)' : 'missing',
    secretFormat,
    secretByteLength:    secretBytes ? secretBytes.length : null,
    secretFirstBytesHex: secretBytes ? secretBytes.slice(0, 4).toString('hex') : null,
    keyFormatDetection:  secretBytes ? detectKeyFormat(secretBytes) : null,
    jwt:                 null,
    coinbase:            null,
    error:               null,
  };

  if (apiKey.includes('/') && secretTrimmed) {
    try {
      const { signCDPJWT } = require('../../lib/coinbase/client');
      const jwt = signCDPJWT(apiKey, apiSecret, 'GET', '/accounts');
      checks.jwt = decodeJwtParts(jwt);
    } catch (e) {
      checks.jwt = { error: e.message };
    }
  }

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
