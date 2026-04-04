"""
Backtester — validates signal accuracy against historical price data.

For each historical signal in onchain_signals:
  1. Find the price at signal_date
  2. Find the price 48-72h later (signal window)
  3. Calculate actual price movement
  4. Mark win/loss based on signal direction vs actual move
  5. Generate accuracy report by signal_type and strategy confirmation

Run: python -m backtesting.backtest
"""

import logging
import statistics
from datetime import datetime, timezone, timedelta
from data.binance import get_klines
from database.client import get_client

log = logging.getLogger(__name__)

# Minimum move to count as a "win" (avoids noise)
MIN_WIN_MOVE_PCT = 1.0  # 1% directional move


def run_backtest(days_back: int = 90) -> dict:
    """
    Pull all closed signals from the past `days_back` days,
    check actual price movement, and calculate accuracy stats.
    """
    db  = get_client()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days_back)).isoformat()

    signals = db.table("onchain_signals") \
                .select("*, signal_strategy_confirmations(*)") \
                .gte("signal_date", cutoff) \
                .order("signal_date") \
                .execute().data or []

    log.info("Backtesting %d signals over %d days", len(signals), days_back)

    results_by_type: dict[str, list[bool]] = {}
    results_by_confirmation: dict[str, list[bool]] = {}

    for sig in signals:
        sig_type  = sig["signal_type"]
        asset     = sig["asset"]
        direction = sig["direction"]
        sig_time  = datetime.fromisoformat(sig["signal_date"].replace("Z", "+00:00"))

        outcome = _check_outcome(asset, direction, sig_time, window_hours=60)
        if outcome is None:
            continue

        # Signal-level accuracy
        if sig_type not in results_by_type:
            results_by_type[sig_type] = []
        results_by_type[sig_type].append(outcome)

        # Confirmation-level accuracy
        for conf in (sig.get("signal_strategy_confirmations") or []):
            if not conf.get("strategy_condition_met"):
                continue
            key = f"{sig_type}+{conf['strategy_name']}"
            if key not in results_by_confirmation:
                results_by_confirmation[key] = []
            results_by_confirmation[key].append(outcome)

    report = {
        "period_days":        days_back,
        "signals_tested":     len(signals),
        "signal_accuracy":    _accuracy_table(results_by_type),
        "confirmation_accuracy": _accuracy_table(results_by_confirmation),
    }

    _print_report(report)
    return report


def _check_outcome(asset: str, direction: str,
                    signal_time: datetime, window_hours: int = 60) -> bool | None:
    """
    Returns True if price moved in the signal direction by > MIN_WIN_MOVE_PCT,
    False if it moved against, None if insufficient data.
    """
    try:
        symbol  = f"{asset}USDT"
        klines  = get_klines(symbol, "1h", limit=window_hours + 10)
        if not klines:
            return None

        # Find the candle at signal time
        signal_ts = signal_time.timestamp()
        entry_price = None
        exit_price  = None

        for i, k in enumerate(klines):
            if abs(k["timestamp"] - signal_ts) < 3600:  # within 1h
                entry_price = k["close"]
                # Exit = close at signal_ts + window_hours
                target_ts = signal_ts + window_hours * 3600
                for j in range(i, min(i + window_hours + 5, len(klines))):
                    if klines[j]["timestamp"] >= target_ts:
                        exit_price = klines[j]["close"]
                        break
                break

        if entry_price is None or exit_price is None:
            return None

        move_pct = ((exit_price - entry_price) / entry_price) * 100

        if direction == "BULLISH":
            return move_pct > MIN_WIN_MOVE_PCT
        elif direction == "BEARISH":
            return move_pct < -MIN_WIN_MOVE_PCT
        else:
            return abs(move_pct) > MIN_WIN_MOVE_PCT

    except Exception as e:
        log.warning("Backtest outcome check failed: %s", e)
        return None


def _accuracy_table(results: dict[str, list[bool]]) -> list[dict]:
    rows = []
    for key, outcomes in results.items():
        if not outcomes:
            continue
        wins = sum(outcomes)
        rows.append({
            "key":       key,
            "signals":   len(outcomes),
            "wins":      wins,
            "losses":    len(outcomes) - wins,
            "accuracy":  round(wins / len(outcomes) * 100, 1),
        })
    return sorted(rows, key=lambda r: r["accuracy"], reverse=True)


def _print_report(report: dict) -> None:
    print(f"\n{'='*60}")
    print(f"BACKTEST REPORT — {report['period_days']} days, {report['signals_tested']} signals")
    print(f"{'='*60}")
    print("\nSignal Accuracy:")
    for r in report["signal_accuracy"]:
        print(f"  {r['key']:<35} {r['accuracy']:.0f}%  ({r['wins']}/{r['signals']})")
    print("\nConfirmation Accuracy (signal + strategy entry conditions):")
    for r in report["confirmation_accuracy"]:
        print(f"  {r['key']:<45} {r['accuracy']:.0f}%  ({r['wins']}/{r['signals']})")
    print()


if __name__ == "__main__":
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    logging.basicConfig(level=logging.INFO)
    run_backtest(days_back=90)
