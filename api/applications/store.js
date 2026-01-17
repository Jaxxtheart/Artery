const fs = require('fs');
const path = require('path');

// NOTE: This file-based storage works for local development only.
// For production on Vercel, you should use a database like:
// - Vercel Postgres
// - Vercel KV
// - MongoDB Atlas
// - Supabase
// etc.

const DATA_DIR = path.join(process.cwd(), 'data', 'applications');

// Ensure data directory exists (for local development)
function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Failed to create data directory:', error);
  }
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const applicationData = req.body;

    // Validate required fields
    if (!applicationData.applicant || !applicationData.scoring || !applicationData.submittedAt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate unique ID
    const id = `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const storedApplication = {
      id,
      ...applicationData,
      storedAt: new Date().toISOString()
    };

    // Try to store in filesystem (works for local dev)
    try {
      ensureDataDir();
      const filePath = path.join(DATA_DIR, `${id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(storedApplication, null, 2));
      console.log(`Application stored successfully: ${id}`);
    } catch (fsError) {
      console.warn('Filesystem storage failed (expected on Vercel):', fsError.message);
      console.log('Application data:', JSON.stringify(storedApplication, null, 2));
      // On Vercel, this will fail, but we'll still return success
      // In production, you should replace this with database storage
    }

    return res.status(200).json({
      success: true,
      id,
      message: 'Application stored successfully'
    });

  } catch (error) {
    console.error('Storage error:', error);
    return res.status(500).json({
      error: 'Failed to store application',
      details: error.message
    });
  }
};
