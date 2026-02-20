-- Migration: Add Research Papers
-- Run this in your Supabase SQL Editor if the applications table
-- already exists and you only need to add the research feature.
--
-- Safe to run multiple times (fully idempotent).

-- ── Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS research_papers (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  title       TEXT        NOT NULL,
  description TEXT,
  file_name   TEXT        NOT NULL,
  file_url    TEXT        NOT NULL,
  file_size   INTEGER,
  is_published BOOLEAN    DEFAULT TRUE NOT NULL
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_research_papers_created_at   ON research_papers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_papers_is_published ON research_papers(is_published);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE research_papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to research_papers" ON research_papers;
CREATE POLICY "Service role has full access to research_papers"
  ON research_papers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read published research_papers" ON research_papers;
CREATE POLICY "Anyone can read published research_papers"
  ON research_papers FOR SELECT TO anon, authenticated
  USING (is_published = true);

-- ── updated_at trigger ───────────────────────────────────────
-- The function already exists (created by the applications migration).
-- Only create it here if it doesn't exist yet.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_research_papers_updated_at ON research_papers;
CREATE TRIGGER update_research_papers_updated_at
  BEFORE UPDATE ON research_papers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Comment ──────────────────────────────────────────────────
COMMENT ON TABLE research_papers IS
  'Stores research PDF metadata uploaded by admins for the public research page';

-- ── Storage bucket reminder ──────────────────────────────────
-- In the Supabase Dashboard:
--   Storage → New bucket → Name: research-pdfs → Public bucket: ON
