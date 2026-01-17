/**
 * Artery Capital - Backend API Server
 * Handles application submissions and scoring
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ScoringEngine = require('./services/scoringEngine');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads', 'pitch-decks');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

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

// In-memory storage (replace with database in production)
const applications = [];
let applicationIdCounter = 1;

/**
 * POST /api/applications/submit
 * Submit a new application and get instant scoring
 */
app.post('/api/applications/submit', upload.single('pitchDeck'), async (req, res) => {
  try {
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
      pitchDeck: req.file ? req.file.filename : null
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

    // Create application record
    const application = {
      id: applicationIdCounter++,
      ...applicationData,
      scoring: scoringResult,
      status: scoringResult.overallScore >= 70 ? 'under_review' : 'received',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      decision: null
    };

    // Store application
    applications.push(application);

    // Log for monitoring
    console.log(`\n${'='.repeat(80)}`);
    console.log(`NEW APPLICATION RECEIVED - ID: ${application.id}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Company: ${applicationData.companyName}`);
    console.log(`Founder: ${applicationData.founderName}`);
    console.log(`Score: ${scoringResult.overallScore}/100 (${scoringResult.rating})`);
    console.log(`Recommendation: ${scoringResult.recommendation}`);
    console.log(`Current Valuation: $${scoringResult.valuation.current.amount.toLocaleString()}`);
    console.log(`5-Year Projection: $${scoringResult.valuation.projected5Year.amount.toLocaleString()}`);
    console.log(`${'='.repeat(80)}\n`);

    // Return response with scoring
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      applicationId: application.id,
      scoring: scoringResult,
      nextSteps: scoringResult.overallScore >= 70
        ? 'Our team will review your application within 3-5 business days.'
        : 'Thank you for your application. We will be in touch if we need additional information.'
    });

  } catch (error) {
    console.error('Application submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process application',
      details: error.message
    });
  }
});

/**
 * GET /api/applications/:id
 * Retrieve application by ID
 */
app.get('/api/applications/:id', (req, res) => {
  const applicationId = parseInt(req.params.id);
  const application = applications.find(app => app.id === applicationId);

  if (!application) {
    return res.status(404).json({
      success: false,
      error: 'Application not found'
    });
  }

  res.json({
    success: true,
    application
  });
});

/**
 * GET /api/applications
 * List all applications (admin endpoint)
 */
app.get('/api/applications', (req, res) => {
  const { minScore, status, sortBy } = req.query;

  let filtered = [...applications];

  // Filter by minimum score
  if (minScore) {
    const minScoreNum = parseFloat(minScore);
    filtered = filtered.filter(app => app.scoring.overallScore >= minScoreNum);
  }

  // Filter by status
  if (status) {
    filtered = filtered.filter(app => app.status === status);
  }

  // Sort
  if (sortBy === 'score') {
    filtered.sort((a, b) => b.scoring.overallScore - a.scoring.overallScore);
  } else {
    filtered.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  res.json({
    success: true,
    total: filtered.length,
    applications: filtered
  });
});

/**
 * POST /api/applications/:id/decision
 * Update application decision (admin endpoint)
 */
app.post('/api/applications/:id/decision', (req, res) => {
  const applicationId = parseInt(req.params.id);
  const { decision, notes } = req.body;

  const application = applications.find(app => app.id === applicationId);

  if (!application) {
    return res.status(404).json({
      success: false,
      error: 'Application not found'
    });
  }

  application.decision = decision;
  application.decisionNotes = notes;
  application.reviewedAt = new Date().toISOString();
  application.status = decision === 'approved' ? 'approved' : 'rejected';

  res.json({
    success: true,
    message: 'Decision recorded',
    application
  });
});

/**
 * GET /api/stats
 * Get application statistics
 */
app.get('/api/stats', (req, res) => {
  const stats = {
    total: applications.length,
    avgScore: applications.reduce((sum, app) => sum + app.scoring.overallScore, 0) / applications.length || 0,
    byRating: {
      exceptional: applications.filter(app => app.scoring.overallScore >= 85).length,
      strong: applications.filter(app => app.scoring.overallScore >= 75 && app.scoring.overallScore < 85).length,
      good: applications.filter(app => app.scoring.overallScore >= 65 && app.scoring.overallScore < 75).length,
      moderate: applications.filter(app => app.scoring.overallScore >= 50 && app.scoring.overallScore < 65).length,
      needsDevelopment: applications.filter(app => app.scoring.overallScore < 50).length
    },
    byStatus: {
      received: applications.filter(app => app.status === 'received').length,
      under_review: applications.filter(app => app.status === 'under_review').length,
      approved: applications.filter(app => app.status === 'approved').length,
      rejected: applications.filter(app => app.status === 'rejected').length
    },
    totalValuation: applications.reduce((sum, app) => sum + app.scoring.valuation.current.amount, 0),
    avgValuation: applications.reduce((sum, app) => sum + app.scoring.valuation.current.amount, 0) / applications.length || 0
  };

  res.json({
    success: true,
    stats
  });
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    applications: applications.length
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 Artery Capital API Server`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`\nAvailable Endpoints:`);
  console.log(`  POST   /api/applications/submit     - Submit application`);
  console.log(`  GET    /api/applications/:id        - Get application by ID`);
  console.log(`  GET    /api/applications            - List all applications`);
  console.log(`  POST   /api/applications/:id/decision - Update decision`);
  console.log(`  GET    /api/stats                   - Get statistics`);
  console.log(`  GET    /api/health                  - Health check`);
  console.log(`${'='.repeat(80)}\n`);
});

module.exports = app;
