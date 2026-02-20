/**
 * Vercel Serverless Function - Research PDF Upload
 * Endpoint: POST /api/research/upload
 *
 * Admin-only endpoint that:
 * 1. Validates the admin password
 * 2. Accepts a PDF file via multipart/form-data
 * 3. Uploads the file to Supabase Storage (bucket: research-pdfs)
 * 4. Saves the metadata to the research_papers table
 */

const multer = require('multer');
const path = require('path');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed.'));
    }
  }
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!validateAdmin(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    await runMiddleware(req, res, upload.single('pdf'));
  } catch (multerError) {
    return res.status(400).json({ success: false, error: multerError.message });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No PDF file provided.' });
  }

  const title = (req.body.title || '').trim();
  const description = (req.body.description || '').trim();

  if (!title) {
    return res.status(400).json({ success: false, error: 'A title is required.' });
  }

  // Initialise Supabase client
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({
      success: false,
      error: 'Storage service not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Build a unique storage path
  const timestamp = Date.now();
  const safeFileName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${timestamp}_${safeFileName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('research-pdfs')
    .upload(storagePath, req.file.buffer, {
      contentType: 'application/pdf',
      upsert: false
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload file to storage.',
      details: uploadError.message
    });
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('research-pdfs')
    .getPublicUrl(storagePath);

  const fileUrl = urlData.publicUrl;

  // Save metadata to database
  const { data: paper, error: dbError } = await supabase
    .from('research_papers')
    .insert([{
      title,
      description: description || null,
      file_name: req.file.originalname,
      file_url: fileUrl,
      file_size: req.file.size,
      is_published: true
    }])
    .select()
    .single();

  if (dbError) {
    console.error('Database insert error:', dbError);
    // Attempt to clean up the uploaded file
    await supabase.storage.from('research-pdfs').remove([storagePath]);
    return res.status(500).json({
      success: false,
      error: 'Failed to save paper metadata.',
      details: dbError.message
    });
  }

  console.log(`📄 Research paper uploaded: "${title}" (${req.file.size} bytes)`);

  return res.status(201).json({
    success: true,
    paper,
    message: 'Research paper uploaded successfully.'
  });
};
