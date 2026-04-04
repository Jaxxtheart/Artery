"""
Risk management for the signal engine.
Mirrors the Half-Kelly logic in lib/trading/risk-manager.js.
"""

from config import (
    STOP_LOSS_PCT, TAKE_PROFIT_PCT, MAX_POSITIONS,
    MAX_POSITION_PCT, DAILY_LOSS_LIMIT_PCT, INITIAL_CAPITAL
)


def calculate_position_size(portfolio_value: float, confidence: float,
                             open_positions: int,
                             win_rate: float = 0.60,
                             avg_win: float = TAKE_PROFIT_PCT,
                             avg_loss: float = STOP_LOSS_PCT) -> float:
    """
    Half-Kelly position size, capped at MAX_POSITION_PCT of portfolio.
    Uses historical win_rate / avg_win / avg_loss when available.
    """
    if open_positions >= MAX_POSITIONS:
        return 0.0

    reward_risk = avg_win / avg_loss if avg_loss > 0 else 2.67
    kelly = (reward_risk * win_rate - (1 - win_rate)) / reward_risk
    fraction = max(0.0, min(kelly * 0.5, MAX_POSITION_PCT))

    # Scale by confidence above the threshold
    confidence_scaler = min((confidence - 0.80) / 0.15 + 1.0, 1.25)
    fraction *= confidence_scaler

    return round(portfolio_value * fraction, 2)


def calculate_stop_levels(entry_price: float) -> tuple[float, float]:
    stop_loss   = round(entry_price * (1 - STOP_LOSS_PCT),   8)
    take_profit = round(entry_price * (1 + TAKE_PROFIT_PCT), 8)
    return stop_loss, take_profit


def check_risk_limits(portfolio_value: float, open_positions: int,
                      start_of_day_value: float) -> tuple[bool, str]:
    """Returns (allowed, reason)."""
    if open_positions >= MAX_POSITIONS:
        return False, f"Max {MAX_POSITIONS} positions already open"

    daily_loss = (portfolio_value - start_of_day_value) / max(start_of_day_value, 1)
    if daily_loss < -DAILY_LOSS_LIMIT_PCT:
        return False, f"Daily loss circuit breaker hit ({daily_loss:.1%})"

    if portfolio_value < 10:
        return False, "Insufficient portfolio value"

    return True, "ok"


def get_historical_win_rate(db_executions: list[dict]) -> dict:
    """
    Calculate per-strategy win rate from closed signal_executions.
    Returns { strategy_name: { win_rate, avg_win, avg_loss } }
    """
    from collections import defaultdict

    stats: dict[str, dict] = defaultdict(lambda: {"wins": 0, "losses": 0, "win_pnl": [], "loss_pnl": []})

    for ex in db_executions:
        if ex.get("status") != "CLOSED" or ex.get("pnl_pct") is None:
            continue
        strategy = ex.get("execution_strategy", "unknown")
        pnl = float(ex["pnl_pct"])
        if pnl > 0:
            stats[strategy]["wins"] += 1
            stats[strategy]["win_pnl"].append(pnl)
        else:
            stats[strategy]["losses"] += 1
            stats[strategy]["loss_pnl"].append(abs(pnl))

    result = {}
    for strategy, s in stats.items():
        total = s["wins"] + s["losses"]
        result[strategy] = {
            "win_rate": s["wins"] / total if total > 0 else 0.60,
            "avg_win":  sum(s["win_pnl"])  / len(s["win_pnl"])  if s["win_pnl"]  else TAKE_PROFIT_PCT,
            "avg_loss": sum(s["loss_pnl"]) / len(s["loss_pnl"]) if s["loss_pnl"] else STOP_LOSS_PCT,
            "total":    total,
        }
    return result
