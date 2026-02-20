/**
 * Local Development Server
 * Runs API endpoints locally for development
 *
 * Usage: npm run server (in a separate terminal from npm run dev)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load environment variables from .env.local if it exists
try {
  const dotenv = require('dotenv');
  const envPath = path.join(__dirname, '.env.local');
  dotenv.config({ path: envPath });
  console.log('✅ Loaded environment variables from .env.local');
} catch (error) {
  console.log('⚠️  No .env.local file found. Using system environment variables.');
}

// Import API handlers
const submitHandler = require('./api/applications/submit.js');
const listHandler = require('./api/applications/list.js');
const getHandler = require('./api/applications/get.js');
const researchUploadHandler = require('./api/research/upload.js');
const researchListHandler = require('./api/research/list.js');
const researchDeleteHandler = require('./api/research/delete.js');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Artery Capital API is running',
    timestamp: new Date().toISOString(),
    environment: {
      supabase: !!process.env.SUPABASE_URL,
      resend: !!process.env.RESEND_API_KEY,
      admin: !!process.env.ADMIN_PASSWORD
    }
  });
});

// Application submission endpoint
app.post('/api/applications/submit', async (req, res) => {
  try {
    await submitHandler(req, res);
  } catch (error) {
    console.error('Submit handler error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// List applications endpoint (admin)
app.get('/api/applications/list', async (req, res) => {
  try {
    await listHandler(req, res);
  } catch (error) {
    console.error('List handler error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get single application endpoint (admin)
app.get('/api/applications/get', async (req, res) => {
  try {
    await getHandler(req, res);
  } catch (error) {
    console.error('Get handler error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Research endpoints
app.post('/api/research/upload', async (req, res) => {
  try {
    await researchUploadHandler(req, res);
  } catch (error) {
    console.error('Research upload handler error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

app.get('/api/research/list', async (req, res) => {
  try {
    await researchListHandler(req, res);
  } catch (error) {
    console.error('Research list handler error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

app.delete('/api/research/delete', async (req, res) => {
  try {
    await researchDeleteHandler(req, res);
  } catch (error) {
    console.error('Research delete handler error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         Artery Capital - Development Server                ║
╚════════════════════════════════════════════════════════════╝

🚀 Server running on: http://localhost:${PORT}

📡 API Endpoints:
   GET    /api/health                   - Health check
   POST   /api/applications/submit      - Submit application
   GET    /api/applications/list        - List applications (admin)
   GET    /api/applications/get?id=...  - Get application (admin)
   POST   /api/research/upload          - Upload research PDF (admin)
   GET    /api/research/list            - List research papers
   DELETE /api/research/delete?id=...  - Delete research paper (admin)

🔧 Environment:
   Supabase: ${process.env.SUPABASE_URL ? '✅ Configured' : '❌ Not configured'}
   Resend:   ${process.env.RESEND_API_KEY ? '✅ Configured' : '❌ Not configured'}
   Admin:    ${process.env.ADMIN_PASSWORD ? '✅ Configured' : '❌ Not configured'}

ℹ️  Frontend: Run "npm run dev" in another terminal
   Visit: http://localhost:5173 (or your Vite port)

⚠️  Note: Set VITE_API_URL=http://localhost:${PORT} in .env.local
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});
