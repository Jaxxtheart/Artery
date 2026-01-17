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
      details: error.message
    });
  }
};
