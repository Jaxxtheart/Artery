/**
 * Vercel Serverless Function - Application Submission
 * Endpoint: /api/applications/submit
 *
 * Phase 4 Backend Integration:
 * - Supabase PostgreSQL database storage
 * - Resend email notifications
 * - IP address and user agent tracking
 * - AI-powered scoring algorithm
 */

const multer = require('multer');
const path = require('path');
const ScoringEngine = require('../scoringEngine.cjs');
const { saveApplication } = require('../lib/supabase');
const { sendApplicationEmails } = require('../lib/email-service');

// Configure multer for memory storage (Vercel doesn't have persistent file system)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Office documents allowed.'));
    }
  }
});

// Initialize scoring engine
const scoringEngine = new ScoringEngine();

/**
 * Extract client IP address from request
 * Works with Vercel's x-forwarded-for header
 */
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  return req.connection?.remoteAddress || 'unknown';
}

/**
 * Extract user agent from request
 */
function getUserAgent(req) {
  return req.headers['user-agent'] || 'unknown';
}

// Helper to run middleware in serverless
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
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Run multer middleware
    await runMiddleware(req, res, upload.single('pitchDeck'));

    // Extract client metadata
    const ipAddress = getClientIP(req);
    const userAgent = getUserAgent(req);

    // Extract application data
    const applicationData = {
      // Step 1: About You
      founderName: req.body.founderName,
      email: req.body.email,
      phone: req.body.phone,
      linkedin: req.body.linkedin,

      // Step 2: Company
      companyName: req.body.companyName,
      country: req.body.country,
      industry: req.body.industry,
      stage: req.body.stage,

      // Step 3: Vision
      problem: req.body.problem,
      solution: req.body.solution,
      impact: req.body.impact,

      // Step 4: Traction
      revenue: req.body.revenue,
      users: req.body.users,
      growth: req.body.growth,
      team: req.body.team,

      // Step 5: Funding
      fundingAmount: req.body.fundingAmount,
      useOfFunds: req.body.useOfFunds,
      runway: req.body.runway,
      pitchDeck: req.file ? req.file.originalname : null,
      pitchDeckUrl: null // TODO: Upload to Supabase Storage in future
    };

    // Validate required fields
    const requiredFields = ['founderName', 'email', 'companyName', 'problem', 'solution'];
    const missingFields = requiredFields.filter(field => !applicationData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields
      });
    }

    // Run scoring algorithm
    const scoringResult = scoringEngine.scoreApplication(applicationData);

    // Log for monitoring
    console.log(`📋 NEW APPLICATION - ${applicationData.companyName} - Score: ${scoringResult.overallScore}/100`);
    console.log(`👤 Founder: ${applicationData.founderName} (${applicationData.email})`);
    console.log(`🌍 Location: ${applicationData.country} | Industry: ${applicationData.industry}`);
    console.log(`📊 IP: ${ipAddress} | User Agent: ${userAgent.substring(0, 50)}...`);

    // Save to database (Phase 4)
    try {
      const savedApplication = await saveApplication(applicationData, {
        ipAddress,
        userAgent
      });
      console.log(`✅ Application saved to database with ID: ${savedApplication.id}`);
    } catch (dbError) {
      // Don't fail the request if database save fails
      console.error('⚠️  Database save failed:', dbError.message);
      console.error('Continuing without database storage...');
    }

    // Send email notifications (Phase 4)
    try {
      const emailResults = await sendApplicationEmails(applicationData, scoringResult);

      if (emailResults.errors && emailResults.errors.length > 0) {
        console.warn('⚠️  Some emails failed:', emailResults.errors);
      } else {
        console.log('✅ Email notifications sent successfully');
      }
    } catch (emailError) {
      // Don't fail the request if email sending fails
      console.error('⚠️  Email sending failed:', emailError.message);
      console.error('Continuing without email notifications...');
    }

    // Return response with scoring
    res.status(201).json({
      success: true,
      scoring: scoringResult,
      nextSteps: scoringResult.overallScore >= 70
        ? 'Our team will review your application within 3-5 business days.'
        : 'Thank you for your application. We will be in touch if we need additional information.',
      message: 'Application submitted successfully! Check your email for confirmation.'
    });

  } catch (error) {
    console.error('❌ Application submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process application',
      details: error.message
    });
  }
};
