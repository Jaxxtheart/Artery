"""
Central configuration for the Artery Wealth Builder signal engine.
All values are read from environment variables with safe defaults.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# ── Coinbase Advanced Trade API ───────────────────────────────────────────────
COINBASE_API_KEY    = os.environ["COINBASE_API_KEY"]
COINBASE_API_SECRET = os.environ["COINBASE_API_SECRET"]

# ── Resend (email) ────────────────────────────────────────────────────────────
RESEND_API_KEY  = os.environ.get("RESEND_API_KEY", "")
ADMIN_EMAIL     = os.environ.get("ADMIN_EMAIL", "jaxxtheart@gmail.com")
FROM_EMAIL      = os.environ.get("FROM_EMAIL", "Artery Trading <trading@arterycapital.co.za>")

# ── External data API keys (optional — graceful fallback when absent) ─────────
GLASSNODE_API_KEY    = os.environ.get("GLASSNODE_API_KEY", "")
CRYPTOQUANT_API_KEY  = os.environ.get("CRYPTOQUANT_API_KEY", "")
DUNE_API_KEY         = os.environ.get("DUNE_API_KEY", "")

# ── Strategy assets ───────────────────────────────────────────────────────────
ASSETS = ["BTC", "ETH"]

# ── Signal decay windows (hours) ─────────────────────────────────────────────
SIGNAL_DECAY = {
    "whale_accumulation":  72,
    "vol_mean_reversion":  48,
    "stablecoin_flows":    96,
    "liquidation_cascade": 24,
}

# ── Risk parameters (must match risk-manager.js) ──────────────────────────────
MIN_CONFIDENCE      = 0.80   # Auto-execute threshold
STOP_LOSS_PCT       = 0.03   # 3% stop-loss
TAKE_PROFIT_PCT     = 0.08   # 8% take-profit
MAX_POSITIONS       = 4
MAX_POSITION_PCT    = 0.25   # 25% of portfolio per position
DAILY_LOSS_LIMIT_PCT = 0.08  # 8% daily circuit breaker
INITIAL_CAPITAL     = float(os.environ.get("INITIAL_CAPITAL", "1441"))

# ── APScheduler timing (UTC) ─────────────────────────────────────────────────
SIGNAL_RUN_HOUR   = 5   # 05:00 UTC  — generate signals
REPORT_RUN_HOUR   = 6   # 06:00 UTC  — send daily email
MONITOR_INTERVAL  = 3600  # seconds — check open positions hourly

# ── Logging ───────────────────────────────────────────────────────────────────
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
