"""
SIGNAL 4: LIQUIDATION CASCADE (4-24hr window) — confirmation use only

Logic:
  IF liquidation_today > liquidation_5d_avg * 3.0:
    liq_score = MIN((today / 5d_avg) / 5.0, 1.0)
    IF score > 0.45: EMIT (direction = dominant liquidation type)

Expected accuracy: 50-55% (tight window, use as confirmation only)
"""

import logging
from signals.base import SignalResult, clamp
from database.client import get_thresholds

log = logging.getLogger(__name__)


def calculate(asset: str, md) -> SignalResult:
    t = get_thresholds("liquidation_cascade", asset)
    liq_spike_ratio = t.get("liq_spike_ratio", 3.0)
    min_confidence  = t.get("min_confidence",  0.45)

    today   = md.liquidation_today
    avg_5d  = md.liquidation_5d_avg
    side    = md.liquidation_side

    signal_data = {
        "liquidation_today":    today,
        "liquidation_5d_avg":   avg_5d,
        "spike_ratio":          round(md.liquidation_spike, 3),
        "dominant_side":        side,
        "data_source":          md.data_sources.get("liquidations", "unknown"),
    }

    if avg_5d <= 0:
        return SignalResult("liquidation_cascade", asset, 0.0, "NEUTRAL",
                            {**signal_data, "reason": "no liquidation baseline"})

    spike_ratio = today / avg_5d

    if spike_ratio < liq_spike_ratio:
        return SignalResult("liquidation_cascade", asset, 0.0, "NEUTRAL",
                            {**signal_data, "reason": f"spike ratio {spike_ratio:.2f}x < {liq_spike_ratio:.0f}x threshold"})

    score      = clamp(spike_ratio / 5.0, 0, 1.0)
    confidence = round(score, 4)
    emit       = confidence > min_confidence

    # Direction: massive long liquidations = price crashed = bearish short-term
    # but can signal a bounce (capitulation) when combined with mean reversion strategy
    direction = "BEARISH" if side == "BEARISH" else "BULLISH"

    if emit:
        log.info("[%s] LIQUIDATION CASCADE — confidence %.2f, spike %.2fx (%s)",
                 asset, confidence, spike_ratio, side)

    return SignalResult(
        signal_type      = "liquidation_cascade",
        asset            = asset,
        confidence_score = confidence,
        direction        = direction,
        signal_data      = signal_data,
        emit             = emit,
    )
