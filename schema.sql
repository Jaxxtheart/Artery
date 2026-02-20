-- Artery Capital Database Schema
-- Phase 4: Backend Integration
-- PostgreSQL (Supabase)

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  -- Primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Founder information
  founder_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  linkedin TEXT,

  -- Company information
  company_name TEXT NOT NULL,
  country TEXT NOT NULL,
  industry TEXT NOT NULL,
  stage TEXT NOT NULL,

  -- Vision
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  impact TEXT NOT NULL,

  -- Traction
  revenue TEXT,
  users TEXT,
  growth TEXT,
  team TEXT NOT NULL,

  -- Funding
  funding_amount TEXT NOT NULL,
  use_of_funds TEXT NOT NULL,
  runway TEXT,
  pitch_deck_url TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'reviewing',
    'discovery_call',
    'deep_dive',
    'approved',
    'rejected'
  )),
  admin_notes TEXT,

  -- Metadata
  ip_address TEXT,
  user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_company_name ON applications(company_name);

-- Enable Row Level Security (RLS)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (full access)
CREATE POLICY "Service role has full access"
  ON applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy for authenticated users (read only for now)
CREATE POLICY "Authenticated users can read all applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for admin dashboard (optional)
CREATE OR REPLACE VIEW applications_summary AS
SELECT
  status,
  COUNT(*) as count,
  AVG(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as recent_percentage
FROM applications
GROUP BY status
ORDER BY count DESC;

-- Comments for documentation
COMMENT ON TABLE applications IS 'Stores all startup funding applications for Artery Capital';
COMMENT ON COLUMN applications.status IS 'Application review status: pending → reviewing → discovery_call → deep_dive → approved/rejected';
COMMENT ON COLUMN applications.ip_address IS 'Client IP address for fraud prevention and analytics';
COMMENT ON COLUMN applications.user_agent IS 'Browser user agent for analytics and troubleshooting';

-- ============================================================
-- Research Papers Table
-- ============================================================

CREATE TABLE IF NOT EXISTS research_papers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  is_published BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_research_papers_created_at ON research_papers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_papers_is_published ON research_papers(is_published);

ALTER TABLE research_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to research_papers"
  ON research_papers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can read published research_papers"
  ON research_papers
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE TRIGGER update_research_papers_updated_at
  BEFORE UPDATE ON research_papers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE research_papers IS 'Stores research PDF metadata uploaded by admins for the public research page';

-- NOTE: You must also create a Supabase Storage bucket named "research-pdfs" with public access.
-- In the Supabase Dashboard: Storage → New bucket → Name: research-pdfs → Public bucket: ON
