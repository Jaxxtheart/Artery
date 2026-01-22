/**
 * Vercel Serverless Function - Health Check & Diagnostics
 * Endpoint: /api/health
 *
 * Checks if all services are configured correctly
 */

const { supabase } = require('../lib/supabase');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const diagnostics = {
    success: true,
    timestamp: new Date().toISOString(),
    environment: {},
    database: {},
    message: 'Artery Capital API Health Check'
  };

  try {
    // Check environment variables
    diagnostics.environment = {
      supabaseUrl: !!process.env.SUPABASE_URL,
      supabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
      adminPassword: !!process.env.ADMIN_PASSWORD,
      resendApiKey: !!process.env.RESEND_API_KEY,
      adminEmail: !!process.env.ADMIN_EMAIL
    };

    // Check database connection and table
    if (supabase) {
      try {
        // Try to query the applications table
        const { data, error, count } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .limit(1);

        if (error) {
          diagnostics.database = {
            connected: true,
            tableExists: false,
            error: error.message,
            hint: error.hint || 'Table "applications" may not exist. Run schema.sql in Supabase SQL Editor.',
            action: 'CREATE_TABLE_NEEDED'
          };
          diagnostics.success = false;
        } else {
          diagnostics.database = {
            connected: true,
            tableExists: true,
            status: 'operational',
            applicationCount: count || 0
          };
        }
      } catch (dbError) {
        diagnostics.database = {
          connected: true,
          error: dbError.message,
          action: 'CHECK_DATABASE_PERMISSIONS'
        };
        diagnostics.success = false;
      }
    } else {
      diagnostics.database = {
        connected: false,
        error: 'Supabase client not initialized',
        hint: 'Check SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables',
        action: 'SET_ENVIRONMENT_VARIABLES'
      };
      diagnostics.success = false;
    }

    // Overall status
    if (!diagnostics.success) {
      diagnostics.message = '⚠️ Configuration issues detected. See diagnostics for details.';
    } else {
      diagnostics.message = '✅ All systems operational';
    }

    res.status(diagnostics.success ? 200 : 500).json(diagnostics);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
