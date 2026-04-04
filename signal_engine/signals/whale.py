"""
SIGNAL 1: WHALE ACCUMULATION (48-72hr window)

Logic:
  exchange_outflow_velocity = (outflow_today - outflow_7d_avg) / outflow_7d_avg
  IF velocity > 0.30:
    whale_score = MIN(velocity * 1.5, 1.0)
    IF stablecoin_inflow_today > stablecoin_7d_avg * 1.5:
      whale_score *= 1.2   # simultaneous stablecoin inflow boosts conviction
    IF whale_score > 0.55:
      EMIT signal (BULLISH)

Expected accuracy: 55-65% over 48-72hr
"""

import logging
import statistics
from datetime import datetime, timezone, timedelta
from signals.base import SignalResult, clamp
from database.client import get_thresholds, get_recent_snapshots

log = logging.getLogger(__name__)


def calculate(asset: str, md) -> SignalResult:
    """
    md: MarketData object from data.aggregator
    Returns a SignalResult (emit=True when confidence > threshold).
    """
    t = get_thresholds("whale_accumulation", asset)
    outflow_velocity_min = t.get("outflow_velocity_min", 0.30)
    stablecoin_ratio     = t.get("stablecoin_boost_ratio", 1.50)
    min_confidence       = t.get("min_confidence", 0.55)

    # Pull 7-day history from DB to calculate rolling averages
    snapshots = get_recent_snapshots(asset, days=8)

    outflow_7d_avg      = _rolling_avg([s["exchange_outflow"]  for s in snapshots if s.get("exchange_outflow")],  7)
    stablecoin_7d_avg   = _rolling_avg([s["stablecoin_inflow"] for s in snapshots if s.get("stablecoin_inflow")], 7)

    outflow_today      = md.exchange_outflow
    stablecoin_today   = md.stablecoin_inflow_today

    signal_data = {
        "outflow_today":      outflow_today,
        "outflow_7d_avg":     outflow_7d_avg,
        "stablecoin_today":   stablecoin_today,
        "stablecoin_7d_avg":  stablecoin_7d_avg,
        "whale_tx_count":     md.whale_transactions,
        "data_source":        md.data_sources.get("exchange_flow", "unknown"),
    }

    # Need baseline to compute velocity
    if outflow_7d_avg <= 0:
        log.info("[%s] whale: no outflow baseline — using raw outflow signal", asset)
        # Fallback: use whale tx count as proxy
        if md.whale_transactions > 50:
            score = clamp(md.whale_transactions / 200, 0, 1.0)
            signal_data["method"] = "whale_tx_count_fallback"
        else:
            return SignalResult("whale_accumulation", asset, 0.0, "NEUTRAL",
                                {**signal_data, "reason": "no baseline data"})
    else:
        velocity = (outflow_today - outflow_7d_avg) / outflow_7d_avg
        signal_data["outflow_velocity"] = round(velocity, 4)

        if velocity <= outflow_velocity_min:
            return SignalResult("whale_accumulation", asset, 0.0, "NEUTRAL",
                                {**signal_data, "reason": f"velocity {velocity:.2%} below {outflow_velocity_min:.0%} threshold"})

        score = clamp(velocity * 1.5, 0, 1.0)
        signal_data["method"] = "outflow_velocity"

        # Simultaneous stablecoin inflow boosts conviction
        if stablecoin_7d_avg > 0 and stablecoin_today > stablecoin_7d_avg * stablecoin_ratio:
            score = clamp(score * 1.2, 0, 1.0)
            signal_data["stablecoin_boost"] = True

    confidence = round(score, 4)
    emit       = confidence > min_confidence

    if emit:
        log.info("[%s] WHALE ACCUMULATION — confidence %.2f", asset, confidence)

    return SignalResult(
        signal_type      = "whale_accumulation",
        asset            = asset,
        confidence_score = confidence,
        direction        = "BULLISH",
        signal_data      = signal_data,
        emit             = emit,
    )


def _rolling_avg(values: list, n: int) -> float:
    clean = [v for v in values if v is not None]
    if not clean:
        return 0.0
    return sum(clean[-n:]) / len(clean[-n:])
