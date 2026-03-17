const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data', 'applications');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Simple authentication check
    const authHeader = req.headers.authorization;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get application ID from query string
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Application ID required' });
    }

    // Try to read from filesystem
    try {
      const filePath = path.join(DATA_DIR, `${id}.json`);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Application not found' });
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const application = JSON.parse(content);

      return res.status(200).json({ application });

    } catch (fsError) {
      console.warn('Filesystem read failed:', fsError.message);
      return res.status(404).json({
        error: 'Application not found',
        note: 'No persistent storage configured. Please set up a database for production.'
      });
    }

  } catch (error) {
    console.error('Get application error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve application',
/**
 * Vercel Serverless Function - Get Single Application
 * Endpoint: /api/applications/get?id={id}
 *
 * Returns a single application by ID for the admin detail page
 * Requires admin authentication
 */

const { getApplication } = require('../lib/supabase');
const ScoringEngine = require('../scoringEngine.cjs');

// Simple admin password check (in production, use proper authentication)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Initialize scoring engine for recalculation if needed
const scoringEngine = new ScoringEngine();

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

    // Get application ID from query
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Application ID is required' });
    }

    // Fetch application from database
    console.log(`📊 Fetching application ${id}...`);
    const dbApplication = await getApplication(id);

    if (!dbApplication) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    // Transform database format to admin UI format
    const applicationData = {
      founderName: dbApplication.founder_name,
      email: dbApplication.email,
      phone: dbApplication.phone,
      linkedin: dbApplication.linkedin,
      companyName: dbApplication.company_name,
      country: dbApplication.country,
      industry: dbApplication.industry,
      stage: dbApplication.stage,
      problem: dbApplication.problem,
      solution: dbApplication.solution,
      impact: dbApplication.impact,
      revenue: dbApplication.revenue,
      users: dbApplication.users,
      growth: dbApplication.growth,
      team: dbApplication.team,
      fundingAmount: dbApplication.funding_amount,
      useOfFunds: dbApplication.use_of_funds,
      runway: dbApplication.runway,
      pitchDeckUrl: dbApplication.pitch_deck_url
    };

    // Recalculate scoring (since we don't store it in DB yet)
    const scoring = scoringEngine.scoreApplication(applicationData);

    // Format response for admin UI
    const application = {
      id: dbApplication.id,
      submittedAt: dbApplication.created_at,
      status: dbApplication.status,
      applicant: {
        name: dbApplication.founder_name,
        email: dbApplication.email,
        phone: dbApplication.phone,
        linkedin: dbApplication.linkedin,
        company: dbApplication.company_name,
        country: dbApplication.country,
        industry: dbApplication.industry,
        stage: dbApplication.stage
      },
      applicationData: applicationData,
      scoring: scoring,
      metadata: {
        ipAddress: dbApplication.ip_address,
        userAgent: dbApplication.user_agent
      },
      adminNotes: dbApplication.admin_notes
    };

    console.log(`✅ Application ${id} retrieved successfully`);

    // Return application
    res.status(200).json({
      success: true,
      application: application
    });

  } catch (error) {
    console.error('❌ Error fetching application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application',
      details: error.message
    });
  }
};
