-- ============================================================================
-- ARTERY CAPITAL DATABASE SETUP
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- Step 1: Drop existing table if it exists (start fresh)
DROP TABLE IF EXISTS applications CASCADE;
DROP VIEW IF EXISTS applications_summary CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Step 2: Create applications table
CREATE TABLE applications (
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

-- Step 3: Create indexes for performance
CREATE INDEX idx_applications_email ON applications(email);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX idx_applications_company_name ON applications(company_name);

-- Step 4: Enable Row Level Security (RLS)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policy for service role (full access)
CREATE POLICY "Service role has full access"
  ON applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 6: Create policy for authenticated users (read only)
CREATE POLICY "Authenticated users can read all applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 7: Add updated_at trigger
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

-- Step 8: Create view for admin dashboard
CREATE OR REPLACE VIEW applications_summary AS
SELECT
  status,
  COUNT(*) as count,
  AVG(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as recent_percentage
FROM applications
GROUP BY status
ORDER BY count DESC;

-- Step 9: Add helpful comments
COMMENT ON TABLE applications IS 'Stores all startup funding applications for Artery Capital';
COMMENT ON COLUMN applications.status IS 'Application review status: pending → reviewing → discovery_call → deep_dive → approved/rejected';
COMMENT ON COLUMN applications.ip_address IS 'Client IP address for fraud prevention and analytics';
COMMENT ON COLUMN applications.user_agent IS 'Browser user agent for analytics and troubleshooting';

-- ============================================================================
-- VERIFICATION: Check if table was created successfully
-- Run this query to verify:
-- ============================================================================
SELECT
  'Table created successfully!' as message,
  COUNT(*) as application_count
FROM applications;

-- If you see a result with "Table created successfully!" then you're all set!
-- ============================================================================
