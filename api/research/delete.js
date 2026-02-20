/**
 * Vercel Serverless Function - Delete Research Paper
 * Endpoint: DELETE /api/research/delete?id={uuid}
 *
 * Admin-only endpoint that removes a research paper record from the
 * database and deletes the corresponding file from Supabase Storage.
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
  res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Type, Date, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!validateAdmin(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Missing paper id.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({
      success: false,
      error: 'Storage service not configured.'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch the paper to get the storage file path before deleting
  const { data: paper, error: fetchError } = await supabase
    .from('research_papers')
    .select('id, file_url, file_name')
    .eq('id', id)
    .single();

  if (fetchError || !paper) {
    return res.status(404).json({ success: false, error: 'Paper not found.' });
  }

  // Delete the database record first
  const { error: dbError } = await supabase
    .from('research_papers')
    .delete()
    .eq('id', id);

  if (dbError) {
    return res.status(500).json({
      success: false,
      error: 'Failed to delete paper record.',
      details: dbError.message
    });
  }

  // Attempt to remove the file from storage (best-effort)
  try {
    // Extract the storage path from the public URL
    const url = new URL(paper.file_url);
    // Public URL format: .../storage/v1/object/public/research-pdfs/<path>
    const pathMatch = url.pathname.match(/\/research-pdfs\/(.+)$/);
    if (pathMatch) {
      const storagePath = pathMatch[1];
      await supabase.storage.from('research-pdfs').remove([storagePath]);
    }
  } catch (storageErr) {
    console.warn('Could not remove file from storage:', storageErr.message);
    // Non-fatal – the DB record is already deleted
  }

  console.log(`🗑️  Research paper deleted: id=${id}`);

  return res.status(200).json({
    success: true,
    message: 'Research paper deleted successfully.'
  });
};
