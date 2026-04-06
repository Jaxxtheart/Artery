"""Shared signal result dataclass and helper."""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SignalResult:
    signal_type:      str
    asset:            str
    confidence_score: float
    direction:        str        # BULLISH | BEARISH | NEUTRAL
    signal_data:      dict = field(default_factory=dict)
    emit:             bool = False  # True when confidence > threshold


def clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))
