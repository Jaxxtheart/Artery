"""
SIGNAL 3: STABLECOIN SUPPLY SHIFTS (72-96hr window)

Logic:
  z_score = (inflow_today - 7d_avg) / 7d_std
  IF z_score > 2.0:
    stablecoin_score = MIN(z_score / 3.0, 1.0)
    IF score > 0.60: EMIT (BULLISH — dry powder entering)

Expected accuracy: 60-70% over 72-96hr
"""

import logging
import statistics
from signals.base import SignalResult, clamp
from database.client import get_thresholds

log = logging.getLogger(__name__)


def calculate(asset: str, md) -> SignalResult:
    t = get_thresholds("stablecoin_flows", asset)
    z_score_min    = t.get("z_score_min",   2.00)
    min_confidence = t.get("min_confidence", 0.60)

    series  = md.stablecoin_7d_series        # list of daily inflow/outflow values
    today   = md.stablecoin_inflow_today

    signal_data = {
        "stablecoin_inflow_today": today,
        "series_length":           len(series),
        "data_source":             md.data_sources.get("stablecoin", "unknown"),
    }

    if len(series) < 5:
        return SignalResult("stablecoin_flows", asset, 0.0, "NEUTRAL",
                            {**signal_data, "reason": "insufficient history (<5 days)"})

    avg = statistics.mean(series)
    std = statistics.stdev(series) if len(series) > 1 else 0

    signal_data.update({"series_avg": round(avg, 2), "series_std": round(std, 2)})

    if std == 0:
        return SignalResult("stablecoin_flows", asset, 0.0, "NEUTRAL",
                            {**signal_data, "reason": "zero std dev — flat stablecoin flow"})

    z_score = (today - avg) / std
    signal_data["z_score"] = round(z_score, 3)

    if z_score < z_score_min:
        return SignalResult("stablecoin_flows", asset, 0.0, "NEUTRAL",
                            {**signal_data, "reason": f"z-score {z_score:.2f} < {z_score_min:.1f} threshold"})

    score      = clamp(z_score / 3.0, 0, 1.0)
    confidence = round(score, 4)
    emit       = confidence > min_confidence

    if emit:
        log.info("[%s] STABLECOIN FLOWS — confidence %.2f, z-score %.2f", asset, confidence, z_score)

    return SignalResult(
        signal_type      = "stablecoin_flows",
        asset            = asset,
        confidence_score = confidence,
        direction        = "BULLISH",  # inflows = dry powder = bullish
        signal_data      = signal_data,
        emit             = emit,
    )
