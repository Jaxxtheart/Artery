"""
Artery Wealth Builder — On-Chain Signal Engine
Entry point. Runs two APScheduler jobs:
  05:00 UTC → generate signals, augment strategies, execute if >= 80%
  06:00 UTC → send daily email report

Also monitors open signal_executions every hour for stop-loss / take-profit.

Usage:
  cd signal_engine
  pip install -r requirements.txt
  python main.py
"""

import logging
import sys
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

import config
from data.aggregator          import fetch as fetch_market_data, to_db_row
from signals.whale            import calculate as whale_signal
from signals.vol              import calculate as vol_signal
from signals.stablecoin       import calculate as stablecoin_signal
from signals.liquidation      import calculate as liquidation_signal
from strategies.augmentor     import augment
from execution.coinbase       import execute_signal, get_portfolio, get_price
from execution.risk           import (calculate_position_size, calculate_stop_levels,
                                       check_risk_limits, get_historical_win_rate)
from database.client          import (insert_signal, broadcast_signal, upsert_market_snapshot,
                                       get_open_signal_executions, close_signal_execution,
                                       insert_execution, get_signals_since, get_execution_stats)
from reporting.email          import send_daily_report

logging.basicConfig(
    level   = config.LOG_LEVEL,
    format  = "%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    datefmt = "%Y-%m-%d %H:%M:%S",
    stream  = sys.stdout,
)
log = logging.getLogger("signal_engine.main")


# ─────────────────────────────────────────────────────────────────────────────
# JOB 1: Signal generation + strategy augmentation + execution
# ─────────────────────────────────────────────────────────────────────────────

def run_signal_pipeline() -> None:
    log.info("=" * 60)
    log.info("SIGNAL PIPELINE START  %s", datetime.now(timezone.utc).isoformat())
    log.info("=" * 60)

    # ── Portfolio snapshot ────────────────────────────────────────────────────
    try:
        portfolio   = get_portfolio()
        total_value = sum(a["value_usd"] for a in portfolio)
        cash_balance = sum(a["value_usd"] for a in portfolio if a["type"] == "cash")
        open_count  = sum(1 for a in portfolio if a["type"] == "crypto" and a["value_usd"] > 10)
        log.info("Portfolio: $%.2f total, $%.2f cash, %d crypto positions",
                 total_value, cash_balance, open_count)
    except Exception as e:
        log.error("Failed to fetch portfolio: %s", e)
        total_value = cash_balance = config.INITIAL_CAPITAL
        open_count  = 0

    # ── Risk gate ─────────────────────────────────────────────────────────────
    allowed, risk_reason = check_risk_limits(total_value, open_count, total_value)
    if not allowed:
        log.warning("Risk gate blocked execution: %s", risk_reason)

    # ── Historical win rates (for Kelly sizing) ───────────────────────────────
    exec_stats_7d  = get_execution_stats(days=30)
    win_rates      = get_historical_win_rate(exec_stats_7d)

    # ── Per-asset signal loop ─────────────────────────────────────────────────
    for asset in config.ASSETS:
        log.info("─── %s ───────────────────────────────────", asset)
        try:
            _process_asset(asset, total_value, cash_balance, open_count,
                           allowed, win_rates)
        except Exception as e:
            log.exception("Unhandled error processing %s: %s", asset, e)

    log.info("SIGNAL PIPELINE COMPLETE")


def _process_asset(asset: str, total_value: float, cash_balance: float,
                   open_count: int, risk_allowed: bool, win_rates: dict) -> None:

    # 1. Fetch and snapshot market data
    md = fetch_market_data(asset)
    try:
        upsert_market_snapshot(to_db_row(md))
    except Exception as e:
        log.warning("[%s] snapshot upsert failed: %s", asset, e)

    # 2. Calculate all four signals
    calculators = [
        ("whale",       whale_signal(asset, md)),
        ("vol",         vol_signal(asset, md)),
        ("stablecoin",  stablecoin_signal(asset, md)),
        ("liquidation", liquidation_signal(asset, md)),
    ]

    for name, signal in calculators:
        if not signal.emit:
            log.info("[%s] %s: no signal (confidence %.2f)", asset, name, signal.confidence_score)
            continue

        log.info("[%s] %s: EMITTING signal (confidence %.2f, %s)",
                 asset, name, signal.confidence_score, signal.direction)

        # 3. Persist signal to DB
        from datetime import timezone
        window_h = config.SIGNAL_DECAY.get(signal.signal_type, 72)
        expires  = (datetime.now(timezone.utc) + timedelta(hours=window_h)).isoformat()

        sig_row = insert_signal({
            "signal_type":     signal.signal_type,
            "asset":           signal.asset,
            "confidence_score": signal.confidence_score,
            "direction":       signal.direction,
            "signal_data":     signal.signal_data,
            "expires_at":      expires,
        })

        # 4. Broadcast to Supabase Realtime
        broadcast_signal(sig_row)

        if not sig_row.get("id"):
            log.error("[%s] DB insert returned no id — skipping augmentation", asset)
            continue

        # 5. Run strategy augmentation
        exec_requests = augment(signal, sig_row["id"])

        # 6. Execute confirmed trades
        if not risk_allowed:
            log.info("[%s] skipping %d exec request(s) — risk gate blocked", asset, len(exec_requests))
            continue

        for req in exec_requests:
            if open_count >= config.MAX_POSITIONS:
                log.info("[%s] max positions reached — skipping", asset)
                break

            # Get per-strategy win rate if available
            sr = win_rates.get(req.strategy_name, {})
            win_rate = sr.get("win_rate", 0.60)
            avg_win  = sr.get("avg_win",  config.TAKE_PROFIT_PCT)
            avg_loss = sr.get("avg_loss", config.STOP_LOSS_PCT)

            pos_size = calculate_position_size(
                cash_balance, req.boosted_confidence, open_count,
                win_rate, avg_win, avg_loss,
            )

            if pos_size < 10:
                log.info("[%s] position size $%.2f too small — skipping", asset, pos_size)
                continue

            if pos_size > cash_balance:
                log.info("[%s] insufficient cash $%.2f for $%.2f position", asset, cash_balance, pos_size)
                pos_size = cash_balance * 0.95  # use available cash

            if pos_size < 10:
                log.info("[%s] adjusted position size still too small — skipping", asset)
                continue

            log.info("[%s] EXECUTING %s via %s: $%.2f (boosted confidence %.2f)",
                     asset, req.direction, req.strategy_name, pos_size, req.boosted_confidence)

            result = execute_signal(asset, req.direction, pos_size)

            if not result["success"]:
                log.error("[%s] Order failed: %s", asset, result.get("error"))
                continue

            # 7. Log execution to DB
            entry_price = result["price"]
            stop, target = calculate_stop_levels(entry_price)
            exec_row = insert_execution({
                "signal_id":          sig_row["id"],
                "execution_strategy": req.strategy_name,
                "coinbase_order_id":  result["order_id"],
                "asset":              asset,
                "side":               req.direction,
                "size":               pos_size,
                "entry_price":        entry_price,
                "entry_time":         datetime.now(timezone.utc).isoformat(),
                "stop_loss":          stop,
                "take_profit":        target,
                "status":             "OPEN",
            })
            log.info("[%s] Execution logged: order %s entry $%.4f stop $%.4f target $%.4f",
                     asset, result["order_id"], entry_price, stop, target)
            open_count   += 1
            cash_balance -= pos_size


# ─────────────────────────────────────────────────────────────────────────────
# JOB 2: Monitor open signal executions (stop-loss / take-profit)
# ─────────────────────────────────────────────────────────────────────────────

def monitor_open_positions() -> None:
    """Hourly check on open signal_executions — close on stop-loss or take-profit."""
    open_execs = get_open_signal_executions()
    if not open_execs:
        return

    log.info("Monitoring %d open signal execution(s)", len(open_execs))

    for ex in open_execs:
        asset  = ex["asset"]
        symbol = f"{asset}-USD"
        try:
            price = get_price(symbol)
        except Exception as e:
            log.warning("[%s] price fetch failed: %s", asset, e)
            continue

        stop   = ex.get("stop_loss")
        target = ex.get("take_profit")
        entry  = ex.get("entry_price", price)
        size   = ex.get("size", 0)

        hit_stop   = stop   and price <= stop
        hit_target = target and price >= target

        if not (hit_stop or hit_target):
            pnl_pct = ((price - entry) / entry) * 100
            log.debug("[%s] open exec %s — price $%.4f pnl %.2f%%", asset, ex["id"], price, pnl_pct)
            continue

        reason = "stop_loss" if hit_stop else "take_profit"
        log.info("[%s] Closing exec %s — %s at $%.4f", asset, ex["id"], reason, price)

        # Execute the sell on Coinbase
        units = size / entry  # approximate units
        result = execute_signal(asset, "SELL", size)

        pnl     = (price - entry) * units
        pnl_pct = ((price - entry) / entry) * 100

        close_signal_execution(ex["id"], price, pnl, pnl_pct)
        log.info("[%s] Closed: pnl $%.2f (%.2f%%) via %s", asset, pnl, pnl_pct, reason)


# ─────────────────────────────────────────────────────────────────────────────
# JOB 3: Daily email report
# ─────────────────────────────────────────────────────────────────────────────

def send_report() -> None:
    log.info("Preparing daily signal report email")
    try:
        signals_24h  = get_signals_since(hours=24)
        exec_today   = [
            ex for sig in signals_24h
            for ex in (sig.get("signal_executions") or [])
        ]
        exec_stats   = get_execution_stats(days=7)
        send_daily_report(signals_24h, exec_today, exec_stats)
    except Exception as e:
        log.error("Failed to send daily report: %s", e)


# ─────────────────────────────────────────────────────────────────────────────
# Scheduler setup
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    log.info("Starting Artery Wealth Builder — On-Chain Signal Engine")
    log.info("Assets: %s | Auto-execute threshold: %.0f%%",
             config.ASSETS, config.MIN_CONFIDENCE * 100)

    scheduler = BlockingScheduler(timezone="UTC")

    # Signal pipeline: 05:00 UTC daily
    scheduler.add_job(
        run_signal_pipeline,
        CronTrigger(hour=config.SIGNAL_RUN_HOUR, minute=0),
        id          = "signal_pipeline",
        name        = "On-Chain Signal Generation + Augmentation",
        max_instances = 1,
        misfire_grace_time = 600,
    )

    # Position monitor: every hour
    scheduler.add_job(
        monitor_open_positions,
        "interval",
        seconds     = config.MONITOR_INTERVAL,
        id          = "position_monitor",
        name        = "Open Signal Position Monitor",
        max_instances = 1,
    )

    # Daily email: 06:00 UTC
    scheduler.add_job(
        send_report,
        CronTrigger(hour=config.REPORT_RUN_HOUR, minute=0),
        id          = "daily_report",
        name        = "Daily Signal Report Email",
        max_instances = 1,
    )

    log.info("Scheduler started. Signal pipeline runs at %02d:00 UTC", config.SIGNAL_RUN_HOUR)
    log.info("Press Ctrl+C to stop.")

    try:
        # Run once immediately on start so you can verify the pipeline
        if "--run-now" in sys.argv:
            log.info("--run-now flag detected, running pipeline immediately")
            run_signal_pipeline()

        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Signal engine stopped.")


if __name__ == "__main__":
    main()
