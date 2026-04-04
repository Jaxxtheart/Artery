"""
Python port of lib/trading/indicators.js
Calculates EMA, RSI (Wilder), MACD, Bollinger Bands, ATR from OHLCV data.
Used by the strategy augmentor to validate entry conditions against live candles.
"""

import numpy as np
from dataclasses import dataclass
from typing import Optional


@dataclass
class CandleIndicators:
    timestamp:  float
    open:       float
    high:       float
    low:        float
    close:      float
    volume:     float
    ema20:      Optional[float]
    ema50:      Optional[float]
    ema200:     Optional[float]
    rsi:        Optional[float]
    macd:       Optional[float]
    macd_signal: Optional[float]
    macd_hist:  Optional[float]
    bb_upper:   Optional[float]
    bb_middle:  Optional[float]
    bb_lower:   Optional[float]
    atr:        Optional[float]


def _ema(values: list[float], period: int) -> list[float]:
    k = 2.0 / (period + 1)
    result = [values[0]]
    for v in values[1:]:
        result.append(v * k + result[-1] * (1 - k))
    return result


def _sma(values: list[float], period: int) -> list[Optional[float]]:
    result: list[Optional[float]] = [None] * (period - 1)
    for i in range(period - 1, len(values)):
        result.append(sum(values[i - period + 1:i + 1]) / period)
    return result


def _wilder_rsi(closes: list[float], period: int = 14) -> list[Optional[float]]:
    result: list[Optional[float]] = [None] * period
    avg_gain = avg_loss = 0.0
    for i in range(1, period + 1):
        change = closes[i] - closes[i - 1]
        avg_gain += max(change, 0)
        avg_loss += max(-change, 0)
    avg_gain /= period
    avg_loss /= period
    rs = avg_gain / avg_loss if avg_loss > 0 else 100
    result.append(100 - 100 / (1 + rs))
    for i in range(period + 1, len(closes)):
        change = closes[i] - closes[i - 1]
        avg_gain = (avg_gain * (period - 1) + max(change, 0))  / period
        avg_loss = (avg_loss * (period - 1) + max(-change, 0)) / period
        rs = avg_gain / avg_loss if avg_loss > 0 else 100
        result.append(100 - 100 / (1 + rs))
    return result


def _macd(closes: list[float], fast=12, slow=26, signal=9):
    fast_ema = _ema(closes, fast)
    slow_ema = _ema(closes, slow)
    macd_line   = [f - s for f, s in zip(fast_ema, slow_ema)]
    signal_line = _ema(macd_line, signal)
    histogram   = [m - s for m, s in zip(macd_line, signal_line)]
    return macd_line, signal_line, histogram


def _bollinger(closes: list[float], period=20, mult=2.0):
    middle = _sma(closes, period)
    upper, lower = [], []
    for i, m in enumerate(middle):
        if m is None:
            upper.append(None)
            lower.append(None)
        else:
            window = closes[max(0, i - period + 1):i + 1]
            std    = float(np.std(window))
            upper.append(m + mult * std)
            lower.append(m - mult * std)
    return upper, middle, lower


def _atr(highs, lows, closes, period=14):
    tr = [closes[0]]
    for i in range(1, len(closes)):
        tr.append(max(
            highs[i] - lows[i],
            abs(highs[i] - closes[i - 1]),
            abs(lows[i]  - closes[i - 1]),
        ))
    return _ema(tr, period)


def calculate_indicators(candles: list[dict]) -> list[CandleIndicators]:
    """
    candles: list of dicts with keys open, high, low, close, volume, timestamp
             (already sorted oldest-first)
    """
    if not candles:
        return []

    opens   = [float(c["open"])   for c in candles]
    highs   = [float(c["high"])   for c in candles]
    lows    = [float(c["low"])    for c in candles]
    closes  = [float(c["close"])  for c in candles]
    volumes = [float(c["volume"]) for c in candles]

    ema20   = _ema(closes, 20)
    ema50   = _ema(closes, 50)
    ema200  = _ema(closes, 200)
    rsi14   = _wilder_rsi(closes, 14)
    ml, sl, mh = _macd(closes)
    bbu, bbm, bbl = _bollinger(closes, 20, 2.0)
    atr14   = _atr(highs, lows, closes, 14)

    result = []
    for i, c in enumerate(candles):
        result.append(CandleIndicators(
            timestamp   = float(c.get("timestamp", 0)),
            open        = opens[i],
            high        = highs[i],
            low         = lows[i],
            close       = closes[i],
            volume      = volumes[i],
            ema20       = ema20[i],
            ema50       = ema50[i],
            ema200      = ema200[i],
            rsi         = rsi14[i],
            macd        = ml[i],
            macd_signal = sl[i],
            macd_hist   = mh[i],
            bb_upper    = bbu[i],
            bb_middle   = bbm[i],
            bb_lower    = bbl[i],
            atr         = atr14[i],
        ))
    return result


def get_candles_from_binance(asset: str, limit: int = 200) -> list[dict]:
    """Fetch 1-hour candles from Binance, return oldest-first list of dicts."""
    from data.binance import get_klines
    sym = f"{asset}USDT"
    raw = get_klines(sym, "1h", limit=limit)
    return raw  # already oldest-first from Binance
