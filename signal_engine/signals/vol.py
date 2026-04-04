"""
SIGNAL 2: REALIZED VOL MEAN REVERSION (24-48hr window)

Logic:
  IF realized_vol_today > realized_vol_30d_avg * 1.5 AND funding_rate > 0.05%:
    vol_spike_score = MIN((today / 30d_avg) * 0.6, 1.0)
    IF score > 0.50: EMIT (COUNTER-TREND — expect reversion)

Expected accuracy: 50-60% over 24-48hr
"""

import logging
from signals.base import SignalResult, clamp
from database.client import get_thresholds

log = logging.getLogger(__name__)


def calculate(asset: str, md) -> SignalResult:
    t = get_thresholds("vol_mean_reversion", asset)
    vol_spike_ratio  = t.get("vol_spike_ratio",  1.50)
    funding_rate_min = t.get("funding_rate_min", 0.0005)
    min_confidence   = t.get("min_confidence",   0.50)

    vol_30d = md.realized_vol_30d
    vol_1d  = md.realized_vol_1d   # proxy for "today's realized vol"
    funding = md.funding_rate

    signal_data = {
        "realized_vol_30d":  vol_30d,
        "realized_vol_1d":   vol_1d,
        "funding_rate":      funding,
        "vol_spike_ratio":   round(vol_1d / vol_30d, 3) if (vol_30d and vol_1d) else None,
        "data_source":       md.data_sources.get("realized_vol", "unknown"),
    }

    if vol_30d is None or vol_1d is None:
        return SignalResult("vol_mean_reversion", asset, 0.0, "NEUTRAL",
                            {**signal_data, "reason": "vol data unavailable"})

    vol_ratio = vol_1d / vol_30d if vol_30d > 0 else 0

    # Conditions
    vol_spike    = vol_ratio > vol_spike_ratio
    funding_high = abs(funding) > funding_rate_min

    if not vol_spike:
        return SignalResult("vol_mean_reversion", asset, 0.0, "NEUTRAL",
                            {**signal_data, "reason": f"vol ratio {vol_ratio:.2f} < {vol_spike_ratio:.1f}x threshold"})

    if not funding_high:
        return SignalResult("vol_mean_reversion", asset, 0.0, "NEUTRAL",
                            {**signal_data, "reason": f"funding rate {funding:.4%} below {funding_rate_min:.4%} minimum"})

    # Score
    score      = clamp(vol_ratio * 0.6, 0, 1.0)
    confidence = round(score, 4)
    emit       = confidence > min_confidence

    if emit:
        log.info("[%s] VOL MEAN REVERSION — confidence %.2f, vol ratio %.2fx", asset, confidence, vol_ratio)

    return SignalResult(
        signal_type      = "vol_mean_reversion",
        asset            = asset,
        confidence_score = confidence,
        direction        = "NEUTRAL",   # counter-trend: direction depends on strategy context
        signal_data      = signal_data,
        emit             = emit,
    )
