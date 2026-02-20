/**
 * Vercel Serverless Function - List Research Papers
 * Endpoint: GET /api/research/list
 *
 * Public endpoint that returns all published research papers.
 * Admin requests (with Authorization header) also receive unpublished papers.
 */

const { createClient } = require('@supabase/supabase-js');

function validateAdmin(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.split(' ')[1];
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  return token === adminPassword;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Type, Date, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ success: true, papers: [] });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const isAdmin = validateAdmin(req);

  let query = supabase
    .from('research_papers')
    .select('*')
    .order('created_at', { ascending: false });

  // Non-admin users only see published papers
  if (!isAdmin) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch research papers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch research papers.',
      details: error.message
    });
  }

  return res.status(200).json({
    success: true,
    papers: data || [],
    count: (data || []).length
  });
};
