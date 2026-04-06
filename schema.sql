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
DROP POLICY IF EXISTS "Service role has full access" ON applications;
CREATE POLICY "Service role has full access"
  ON applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy for authenticated users (read only for now)
DROP POLICY IF EXISTS "Authenticated users can read all applications" ON applications;
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

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
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
-- QUANTUM ALPHA TRADING SYSTEM SCHEMA
-- Phase 5: Algorithmic Trading
-- ============================================================

-- Open and closed trading positions
CREATE TABLE IF NOT EXISTS positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  entry_price DECIMAL(18, 8) NOT NULL,
  size DECIMAL(18, 8) NOT NULL,
  strategy TEXT NOT NULL,
  stop_loss DECIMAL(18, 8),
  take_profit DECIMAL(18, 8),
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  exit_time TIMESTAMP WITH TIME ZONE,
  exit_price DECIMAL(18, 8),
  pnl_usd DECIMAL(18, 8),
  pnl_pct DECIMAL(8, 4),
  coinbase_order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Completed trade history
CREATE TABLE IF NOT EXISTS trade_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  entry_price DECIMAL(18, 8) NOT NULL,
  exit_price DECIMAL(18, 8) NOT NULL,
  size DECIMAL(18, 8) NOT NULL,
  pnl_usd DECIMAL(18, 8) NOT NULL,
  pnl_pct DECIMAL(8, 4) NOT NULL,
  strategy TEXT NOT NULL,
  reason TEXT,
  duration_hours DECIMAL(8, 2),
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  exit_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily portfolio snapshots for charting
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total_value DECIMAL(18, 8) NOT NULL,
  cash_balance DECIMAL(18, 8) NOT NULL,
  crypto_value DECIMAL(18, 8) NOT NULL,
  total_pnl DECIMAL(18, 8) NOT NULL,
  daily_pnl DECIMAL(18, 8) DEFAULT 0,
  open_positions INTEGER DEFAULT 0,
  snapshot_date DATE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Strategy performance aggregates
CREATE TABLE IF NOT EXISTS strategy_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy_name TEXT NOT NULL UNIQUE,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  total_pnl DECIMAL(18, 8) DEFAULT 0,
  win_rate DECIMAL(5, 2),
  avg_win DECIMAL(18, 8),
  avg_loss DECIMAL(18, 8),
  sharpe_ratio DECIMAL(8, 4),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trading signals log
CREATE TABLE IF NOT EXISTS signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  signal TEXT NOT NULL CHECK (signal IN ('BUY', 'SELL', 'HOLD')),
  confidence DECIMAL(5, 4) NOT NULL,
  strategy TEXT NOT NULL,
  price DECIMAL(18, 8) NOT NULL,
  reason TEXT,
  executed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Manual cost basis entries for externally purchased holdings
CREATE TABLE IF NOT EXISTS holdings_cost_basis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  currency TEXT NOT NULL UNIQUE,
  total_spent DECIMAL(18, 8) NOT NULL,  -- total USD paid across all purchases
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE holdings_cost_basis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on holdings_cost_basis"
  ON holdings_cost_basis FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_positions_created_at ON positions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_history_created_at ON trade_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_executed ON signals(executed);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_date ON portfolio_snapshots(snapshot_date DESC);

-- Row Level Security for trading tables
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on positions" ON positions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on trade_history" ON trade_history FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on portfolio_snapshots" ON portfolio_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on strategy_performance" ON strategy_performance FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on signals" ON signals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to update strategy performance after each trade close
CREATE OR REPLACE FUNCTION update_strategy_performance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO strategy_performance (strategy_name, total_trades, winning_trades, losing_trades, total_pnl, win_rate)
  VALUES (
    NEW.strategy,
    1,
    CASE WHEN NEW.pnl_usd > 0 THEN 1 ELSE 0 END,
    CASE WHEN NEW.pnl_usd <= 0 THEN 1 ELSE 0 END,
    NEW.pnl_usd,
    CASE WHEN NEW.pnl_usd > 0 THEN 100.0 ELSE 0.0 END
  )
  ON CONFLICT (strategy_name) DO UPDATE SET
    total_trades = strategy_performance.total_trades + 1,
    winning_trades = strategy_performance.winning_trades + CASE WHEN NEW.pnl_usd > 0 THEN 1 ELSE 0 END,
    losing_trades = strategy_performance.losing_trades + CASE WHEN NEW.pnl_usd <= 0 THEN 1 ELSE 0 END,
    total_pnl = strategy_performance.total_pnl + NEW.pnl_usd,
    win_rate = ROUND(
      (strategy_performance.winning_trades + CASE WHEN NEW.pnl_usd > 0 THEN 1 ELSE 0 END)::DECIMAL /
      (strategy_performance.total_trades + 1) * 100, 2
    ),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_strategy_performance ON trade_history;
CREATE TRIGGER trigger_update_strategy_performance
  AFTER INSERT ON trade_history
  FOR EACH ROW
  EXECUTE FUNCTION update_strategy_performance();
