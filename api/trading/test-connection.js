/**
 * GET /api/trading/test-connection
 * Diagnoses Coinbase API connectivity issues
 */

const { createCoinbaseClient } = require('../../lib/coinbase/client');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey    = process.env.COINBASE_API_KEY    || '';
  const apiSecret = process.env.COINBASE_API_SECRET || '';

  const diagnosis = {
    env: {
      COINBASE_API_KEY_set:    apiKey.length > 0,
      COINBASE_API_SECRET_set: apiSecret.length > 0,
      key_format:  apiKey.includes('/')          ? 'CDP (organizations/…/apiKeys/…)' : apiKey.length > 0 ? 'Legacy or unknown' : 'NOT SET',
      pem_header:  apiSecret.includes('BEGIN EC PRIVATE KEY') ? 'EC (ES256)' :
                   apiSecret.includes('BEGIN PRIVATE KEY')    ? 'Ed25519 (EdDSA)' :
                   apiSecret.length > 0                       ? 'Unknown / malformed PEM' : 'NOT SET',
      pem_has_real_newlines:    apiSecret.includes('\n'),
      pem_has_escaped_newlines: apiSecret.includes('\\n'),
    },
    coinbase: null,
  };

  if (!apiKey || !apiSecret) {
    return res.status(200).json({ ok: false, diagnosis, error: 'Missing environment variables' });
  }

  try {
    const coinbase = createCoinbaseClient();
    // Minimal call — just fetch the accounts list
    const data = await coinbase.getAccounts();
    diagnosis.coinbase = { ok: true, accounts: data?.accounts?.length ?? 0 };
    return res.status(200).json({ ok: true, diagnosis });
  } catch (err) {
    diagnosis.coinbase = { ok: false, error: err.message };
    return res.status(200).json({ ok: false, diagnosis, error: err.message });
  }
};
