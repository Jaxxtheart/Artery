"""
Strategy Augmentor — Phase 2 of the signal pipeline.

For each on-chain signal, checks whether each of the three strategies
(Momentum, Mean Reversion, Breakout) has its entry conditions met.
If yes, boosts the strategy's confidence by the signal-specific amount.
Records results in signal_strategy_confirmations.
Returns a list of ExecutionRequest objects when boosted_confidence >= 0.80.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional
from signals.base import SignalResult, clamp
from strategies.indicators import calculate_indicators, get_candles_from_binance
from database.client import insert_confirmation
from config import MIN_CONFIDENCE

log = logging.getLogger(__name__)


@dataclass
class ExecutionRequest:
    signal_id:          str
    strategy_name:      str
    asset:              str
    direction:          str        # BUY | SELL
    base_confidence:    float
    boosted_confidence: float
    boost_amount:       float
    strategy_details:   dict = field(default_factory=dict)


# ── Boost table: signal_type → strategy → boost amount ───────────────────────
BOOST_TABLE: dict[str, dict[str, float]] = {
    "whale_accumulation": {
        "momentum":       +0.10,
        "mean_reversion": +0.15,
        "breakout":       +0.10,
    },
    "vol_mean_reversion": {
        "momentum":       -0.05,   # caution during vol spike
        "mean_reversion": +0.20,   # panic reversal confirmation
        "breakout":       +0.15,   # vol spike confirms breakout
    },
    "stablecoin_flows": {
        "momentum":       +0.12,
        "mean_reversion": +0.10,
        "breakout":       +0.08,
    },
    "liquidation_cascade": {
        "momentum":       -0.05,   # flag potential reversal
        "mean_reversion": +0.10,   # confirms bounce after capitulation
        "breakout":       +0.08,   # validates directional momentum
    },
}


# ── Strategy entry condition checkers ────────────────────────────────────────

def _check_momentum(last, prev) -> tuple[bool, float, dict]:
    """
    Returns (conditions_met, base_confidence, details_dict)
    Mirrors getMomentumSignal() from strategies.js exactly.
    """
    if last is None or prev is None:
        return False, 0.0, {"error": "insufficient candles"}
    if any(x is None for x in [last.rsi, last.macd_hist, last.ema20, last.ema50, last.ema200]):
        return False, 0.0, {"error": "indicators not ready"}

    ema_bullish   = last.ema20 > last.ema50
    ema_cross     = prev.ema20 <= prev.ema50 and last.ema20 > last.ema50
    rsi_healthy   = 40 < last.rsi < 65
    macd_positive = last.macd_hist > 0 and last.macd_hist > prev.macd_hist
    above_trend   = last.ema50 > last.ema200

    details = {
        "ema_bullish":   ema_bullish,
        "ema_cross":     ema_cross,
        "rsi":           round(last.rsi, 2),
        "rsi_healthy":   rsi_healthy,
        "macd_hist":     round(last.macd_hist, 6),
        "macd_positive": macd_positive,
        "above_trend":   above_trend,
    }

    conditions_met = ema_bullish and rsi_healthy and macd_positive and above_trend

    if not conditions_met:
        return False, 0.0, details

    confidence = 0.60
    if ema_cross:      confidence += 0.15
    if last.rsi > 50:  confidence += 0.10
    if macd_positive:  confidence += 0.10
    if above_trend:    confidence += 0.05

    return True, clamp(confidence, 0, 0.95), details


def _check_mean_reversion(last, candles_24h_ago) -> tuple[bool, float, dict]:
    """Mirrors getMeanReversionSignal() from strategies.js."""
    if last is None:
        return False, 0.0, {"error": "insufficient candles"}
    if any(x is None for x in [last.rsi, last.bb_lower, last.bb_middle]):
        return False, 0.0, {"error": "indicators not ready"}

    change_24h = 0.0
    if candles_24h_ago:
        change_24h = ((last.close - candles_24h_ago.close) / candles_24h_ago.close) * 100

    oversold       = last.rsi < 32
    at_lower_bb    = last.close <= last.bb_lower * 1.01
    significant_drop = change_24h < -10

    details = {
        "rsi":            round(last.rsi, 2),
        "oversold":       oversold,
        "close":          last.close,
        "bb_lower":       round(last.bb_lower, 4) if last.bb_lower else None,
        "at_lower_bb":    at_lower_bb,
        "change_24h_pct": round(change_24h, 2),
        "significant_drop": significant_drop,
    }

    conditions_met = oversold and at_lower_bb and significant_drop

    if not conditions_met:
        return False, 0.0, details

    confidence = 0.55
    if last.rsi < 25:         confidence += 0.20
    if change_24h < -20:      confidence += 0.15
    if last.close <= last.bb_lower: confidence += 0.10

    return True, clamp(confidence, 0, 0.90), details


def _check_breakout(last, recent_20) -> tuple[bool, float, dict]:
    """Mirrors getBreakoutSignal() from strategies.js."""
    if last is None or len(recent_20) < 2:
        return False, 0.0, {"error": "insufficient candles"}
    if last.atr is None or last.rsi is None:
        return False, 0.0, {"error": "indicators not ready"}

    high_20    = max(c.high  for c in recent_20)
    low_20     = min(c.low   for c in recent_20)
    avg_vol    = sum(c.volume for c in recent_20[:-1]) / max(len(recent_20) - 1, 1)
    vol_spike  = last.volume > avg_vol * 1.5

    at_breakout = last.close > high_20 * 0.998
    rsi_ok      = last.rsi < 75

    details = {
        "close":      last.close,
        "high_20":    round(high_20, 4),
        "low_20":     round(low_20, 4),
        "vol_spike":  vol_spike,
        "volume":     last.volume,
        "avg_volume": round(avg_vol, 2),
        "rsi":        round(last.rsi, 2),
        "at_breakout": at_breakout,
    }

    conditions_met = at_breakout and vol_spike and rsi_ok

    if not conditions_met:
        return False, 0.0, details

    return True, 0.80, details  # FIXED confidence for breakout


# ── Main augmentation function ────────────────────────────────────────────────

def augment(signal: SignalResult, signal_db_id: str) -> list[ExecutionRequest]:
    """
    Run all three strategy checks against live candles, apply signal boosts,
    persist confirmations to DB, and return execution requests.
    """
    asset = signal.asset

    # Fetch and calculate indicators
    try:
        candles    = get_candles_from_binance(asset, limit=210)
        indicators = calculate_indicators(candles)
    except Exception as e:
        log.error("[%s] Failed to get candles for augmentation: %s", asset, e)
        return []

    if len(indicators) < 52:
        log.warning("[%s] Not enough candle data (%d)", asset, len(indicators))
        return []

    last    = indicators[-1]
    prev    = indicators[-2]
    ago_24h = indicators[-25] if len(indicators) >= 25 else indicators[0]
    recent_20 = indicators[-20:]

    boost_map = BOOST_TABLE.get(signal.signal_type, {})
    exec_requests: list[ExecutionRequest] = []

    strategies_checked = [
        ("momentum",       lambda: _check_momentum(last, prev)),
        ("mean_reversion", lambda: _check_mean_reversion(last, ago_24h)),
        ("breakout",       lambda: _check_breakout(last, recent_20)),
    ]

    confirmations = []
    for strategy_name, check_fn in strategies_checked:
        try:
            condition_met, base_conf, details = check_fn()
        except Exception as e:
            log.error("[%s] Strategy check failed (%s): %s", asset, strategy_name, e)
            continue

        boost  = boost_map.get(strategy_name, 0.0)
        signal_dir_ok = _signal_compatible(signal, strategy_name)

        if not signal_dir_ok:
            # Signal direction incompatible — don't boost, just record
            boost = 0.0

        boosted = clamp(base_conf + boost, 0, 0.95) if condition_met else 0.0

        conf_row = {
            "signal_id":                 signal_db_id,
            "strategy_name":             strategy_name,
            "strategy_condition_met":    condition_met,
            "strategy_confidence":       round(base_conf, 4) if condition_met else None,
            "signal_boosted_confidence": round(boosted, 4) if condition_met else None,
            "boost_amount":              round(boost, 4),
            "confirmation_details":      {**details, "signal_compatible": signal_dir_ok},
        }
        insert_confirmation(conf_row)
        confirmations.append((strategy_name, condition_met, base_conf, boosted))

        log.info("[%s] %s: condition_met=%s base=%.2f boosted=%.2f",
                 asset, strategy_name, condition_met, base_conf, boosted)

        if condition_met and boosted >= MIN_CONFIDENCE:
            exec_requests.append(ExecutionRequest(
                signal_id          = signal_db_id,
                strategy_name      = strategy_name,
                asset              = asset,
                direction          = "BUY",
                base_confidence    = base_conf,
                boosted_confidence = boosted,
                boost_amount       = boost,
                strategy_details   = details,
            ))

    # Multi-strategy consensus bonus
    passing = [(n, b, bst) for n, met, b, bst in confirmations if met and bst >= MIN_CONFIDENCE]
    if len(passing) >= 2:
        log.info("[%s] MULTI-STRATEGY CONSENSUS (%d strategies)", asset, len(passing))
        for req in exec_requests:
            req.boosted_confidence = clamp(req.boosted_confidence + 0.05, 0, 0.95)
        if exec_requests:
            exec_requests[0].strategy_name = "multi_strategy"
            # Keep only the single highest-confidence request on consensus
            exec_requests.sort(key=lambda r: r.boosted_confidence, reverse=True)
            exec_requests = exec_requests[:1]

    return exec_requests


def _signal_compatible(signal: SignalResult, strategy: str) -> bool:
    """
    Vol spike is counter-trend — incompatible with momentum BUY direction.
    Liquidation cascade: depends on direction.
    """
    if signal.signal_type == "vol_mean_reversion" and strategy == "momentum":
        return False   # vol spike = caution flag, not a momentum booster
    if signal.signal_type == "liquidation_cascade":
        if signal.direction == "BEARISH" and strategy == "momentum":
            return False
    return True
