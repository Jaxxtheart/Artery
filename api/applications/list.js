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
    // Simple authentication check - in production, use proper auth
    const authHeader = req.headers.authorization;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'; // Change this!

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Try to read from filesystem
    try {
      if (!fs.existsSync(DATA_DIR)) {
        return res.status(200).json({ applications: [] });
      }

      const files = fs.readdirSync(DATA_DIR);
      const applications = files
        .filter(f => f.endsWith('.json'))
        .map(f => {
          try {
            const content = fs.readFileSync(path.join(DATA_DIR, f), 'utf8');
            return JSON.parse(content);
          } catch (error) {
            console.error(`Error reading file ${f}:`, error);
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

      return res.status(200).json({ applications });

    } catch (fsError) {
      console.warn('Filesystem read failed (expected on Vercel):', fsError.message);
      // On Vercel without database, return empty array
      return res.status(200).json({
        applications: [],
        note: 'No persistent storage configured. Please set up a database for production.'
      });
    }

  } catch (error) {
    console.error('List error:', error);
    return res.status(500).json({
      error: 'Failed to list applications',
      details: error.message
    });
  }
};
