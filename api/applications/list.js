/**
 * Vercel Serverless Function - List Applications
 * Endpoint: /api/applications/list
 *
 * Returns all applications for the admin dashboard
 * Requires admin authentication
 */

const { getAllApplications } = require('../../lib/supabase');

// Simple admin password check (in production, use proper authentication)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * Helper to run middleware
 */
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Get query parameters for filtering
    const { status, email } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (email) filters.email = email;

    // Fetch applications from database
    console.log('📊 Fetching applications from database...');
    const dbApplications = await getAllApplications(filters);

    console.log(`✅ Retrieved ${dbApplications.length} applications`);

    // Initialize scoring engine for calculating scores
    const ScoringEngine = require('../scoringEngine.cjs');
    const scoringEngine = new ScoringEngine();

    // Transform database format to admin UI format
    const applications = dbApplications.map(dbApp => {
      // Reconstruct application data for scoring
      const applicationData = {
        founderName: dbApp.founder_name,
        email: dbApp.email,
        phone: dbApp.phone,
        linkedin: dbApp.linkedin,
        companyName: dbApp.company_name,
        country: dbApp.country,
        industry: dbApp.industry,
        stage: dbApp.stage,
        problem: dbApp.problem,
        solution: dbApp.solution,
        impact: dbApp.impact,
        revenue: dbApp.revenue,
        users: dbApp.users,
        growth: dbApp.growth,
        team: dbApp.team,
        fundingAmount: dbApp.funding_amount,
        useOfFunds: dbApp.use_of_funds,
        runway: dbApp.runway,
        pitchDeckUrl: dbApp.pitch_deck_url
      };

      // Calculate scoring
      const scoring = scoringEngine.scoreApplication(applicationData);

      // Return in format expected by admin UI
      return {
        id: dbApp.id,
        submittedAt: dbApp.created_at,
        status: dbApp.status,
        applicant: {
          name: dbApp.founder_name,
          email: dbApp.email,
          phone: dbApp.phone,
          linkedin: dbApp.linkedin,
          company: dbApp.company_name,
          country: dbApp.country,
          industry: dbApp.industry,
          stage: dbApp.stage
        },
        applicationData: applicationData,
        scoring: scoring
      };
    });

    // Return applications
    res.status(200).json({
      success: true,
      applications: applications,
      count: applications.length
    });

  } catch (error) {
    console.error('❌ Error fetching applications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications',
      details: error.message
    });
  }
};
