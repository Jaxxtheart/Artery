/**
 * Supabase Client Configuration
 * Connects to PostgreSQL database for storing applications
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client. Values pasted into the Vercel dashboard often
// pick up stray whitespace or quotes, which make an otherwise-correct URL
// invalid — strip them.
const cleanEnv = (value) => (value || '').trim().replace(/^['"]|['"]$/g, '');
const supabaseUrl = cleanEnv(process.env.SUPABASE_URL);
const supabaseKey = cleanEnv(process.env.SUPABASE_SERVICE_KEY);

// createClient() validates the URL and throws synchronously on a malformed
// value. That throw happens at require() time, outside any route handler's
// try/catch, and crashes the entire serverless function (Vercel's
// FUNCTION_INVOCATION_FAILED) instead of a normal in-app error. Guard it so
// a bad env var degrades to "not configured" like a missing one does, and
// record exactly what is wrong so callers can report it.
let supabase = null;
let configError = null;
const missing = [!supabaseUrl && 'SUPABASE_URL', !supabaseKey && 'SUPABASE_SERVICE_KEY'].filter(Boolean);
if (missing.length) {
  configError = `Supabase is not configured: ${missing.join(' and ')} not set in this deployment's environment (${process.env.VERCEL_ENV || 'local'}).`;
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    configError = `Supabase is not configured: SUPABASE_URL is invalid (${error.message}). It should look like https://<project-ref>.supabase.co`;
  }
}
if (configError) {
  console.error(`⚠️  ${configError}`);
}

/**
 * Save application to database
 * @param {Object} applicationData - Application form data
 * @param {Object} metadata - Additional metadata (IP, user agent, etc.)
 * @returns {Promise<Object>} - Saved application record
 */
async function saveApplication(applicationData, metadata = {}) {
  if (!supabase) {
    throw new Error(configError);
  }

  const record = {
    // Founder information
    founder_name: applicationData.founderName,
    email: applicationData.email,
    phone: applicationData.phone,
    linkedin: applicationData.linkedin || null,

    // Company information
    company_name: applicationData.companyName,
    country: applicationData.country,
    industry: applicationData.industry,
    stage: applicationData.stage,

    // Vision
    problem: applicationData.problem,
    solution: applicationData.solution,
    impact: applicationData.impact,

    // Traction
    revenue: applicationData.revenue || null,
    users: applicationData.users || null,
    growth: applicationData.growth || null,
    team: applicationData.team,

    // Funding
    funding_amount: applicationData.fundingAmount,
    use_of_funds: applicationData.useOfFunds,
    runway: applicationData.runway || null,
    pitch_deck_url: applicationData.pitchDeckUrl || null,

    // Metadata
    ip_address: metadata.ipAddress || null,
    user_agent: metadata.userAgent || null,

    // Initial status
    status: 'pending',
    admin_notes: null
  };

  const { data, error } = await supabase
    .from('applications')
    .insert([record])
    .select()
    .single();

  if (error) {
    console.error('Supabase error:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}

/**
 * supabase-js reports a network failure as a bare "TypeError: fetch failed",
 * dropping the underlying cause. Re-issue a plain request to find out why
 * (DNS, refused connection, TLS...) so the admin UI shows something actionable.
 */
async function describeError(error) {
  if (!/fetch failed/i.test(error.message || '')) return error.message;

  let host = supabaseUrl;
  try {
    host = new URL(supabaseUrl).host;
    await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/`, { headers: { apikey: supabaseKey } });
    return `${error.message} (Supabase at ${host} is reachable now — likely a transient network error, try again)`;
  } catch (probeError) {
    const cause = probeError.cause || probeError;
    const code = cause.code || cause.name || 'unknown';
    const hints = {
      ENOTFOUND: 'hostname does not resolve — check SUPABASE_URL in Vercel, and that the Supabase project is not paused or deleted',
      EAI_AGAIN: 'DNS lookup timed out — check SUPABASE_URL and that the Supabase project is not paused',
      ECONNREFUSED: 'connection refused — check SUPABASE_URL',
      UND_ERR_CONNECT_TIMEOUT: 'connection timed out — the Supabase project may be paused or unreachable'
    };
    return `Cannot reach Supabase at ${host}: ${code} — ${hints[code] || cause.message}`;
  }
}

/**
 * Get application by ID
 * @param {string} id - Application UUID
 * @returns {Promise<Object>} - Application record
 */
async function getApplication(id) {
  if (!supabase) {
    throw new Error(configError);
  }

  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch application: ${await describeError(error)}`);
  }

  return data;
}

/**
 * Get all applications (for admin)
 * @param {Object} filters - Optional filters (status, email, etc.)
 * @returns {Promise<Array>} - Array of application records
 */
async function getAllApplications(filters = {}) {
  if (!supabase) {
    throw new Error(configError);
  }

  let query = supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.email) {
    query = query.eq('email', filters.email);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch applications: ${await describeError(error)}`);
  }

  return data;
}

/**
 * Update application status
 * @param {string} id - Application UUID
 * @param {string} status - New status
 * @param {string} notes - Admin notes (optional)
 * @returns {Promise<Object>} - Updated application
 */
async function updateApplicationStatus(id, status, notes = null) {
  if (!supabase) {
    throw new Error(configError);
  }

  const updates = { status };
  if (notes) {
    updates.admin_notes = notes;
  }

  const { data, error } = await supabase
    .from('applications')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update application: ${error.message}`);
  }

  return data;
}

/**
 * Get the trading bot's P&L baseline (initial capital).
 * Reads the single settings row; if none has ever been set, the baseline
 * defaults to `fallback` (the caller's current live portfolio value) so a
 * fresh deployment starts at 0% P&L instead of an arbitrary hardcoded number.
 * @param {number} fallback - value to use when no baseline row exists yet
 * @returns {Promise<number>}
 */
async function getInitialCapital(fallback) {
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from('bot_settings')
    .select('initial_capital')
    .eq('id', 1)
    .single();

  if (error || !data) return fallback;
  return parseFloat(data.initial_capital);
}

/**
 * Reset the P&L baseline to a specific value (e.g. the current live portfolio value).
 * @param {number} value
 * @returns {Promise<Object>} - the stored settings row
 */
async function setInitialCapital(value) {
  if (!supabase) {
    throw new Error(configError);
  }

  const { data, error } = await supabase
    .from('bot_settings')
    .upsert({ id: 1, initial_capital: value, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to set initial capital: ${error.message}`);
  }

  return data;
}

module.exports = {
  supabase,
  saveApplication,
  getApplication,
  getAllApplications,
  updateApplicationStatus,
  getInitialCapital,
  setInitialCapital
};
