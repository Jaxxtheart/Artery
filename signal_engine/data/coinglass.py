"""
CoinGlass free API client.
Provides: liquidation data (long/short liquidations by asset).
Free tier: https://open-api.coinglass.com  (limited calls/day)
"""

import logging
import requests

log = logging.getLogger(__name__)

BASE    = "https://open-api.coinglass.com/public/v2"
TIMEOUT = 15


def _get(path: str, params: dict = None) -> dict:
    try:
        r = requests.get(f"{BASE}{path}", params=params, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log.warning("CoinGlass request failed (%s): %s", path, e)
        return {}


def get_liquidations(asset: str = "BTC", days: int = 7) -> list[dict]:
    """
    Fetch historical liquidation data.
    Returns list of { date, long_liq_usd, short_liq_usd, total_liq_usd }.

    CoinGlass free endpoint: /liquidation/info
    asset: BTC | ETH
    """
    data = _get("/liquidation/info", {"symbol": asset, "time_type": "h4", "limit": days * 6})
    rows = data.get("data", {}).get("dataList", [])

    result = []
    for r in rows:
        try:
            result.append({
                "timestamp":      r.get("t", 0),
                "long_liq_usd":   float(r.get("longLiqUsd",  0)),
                "short_liq_usd":  float(r.get("shortLiqUsd", 0)),
                "total_liq_usd":  float(r.get("longLiqUsd",  0)) + float(r.get("shortLiqUsd", 0)),
            })
        except (KeyError, TypeError, ValueError):
            continue

    return sorted(result, key=lambda x: x["timestamp"])


def get_liquidation_summary(asset: str = "BTC") -> dict:
    """
    Return today's liquidation totals + 5-day average.
    Uses the last 30 4-hour buckets (5 days) to calculate the avg.

    Returns: { today_liq, avg_5d, spike_ratio, dominant_side }
    """
    rows = get_liquidations(asset, days=6)

    if not rows:
        log.warning("No liquidation data for %s — returning zeros", asset)
        return {
            "today_liq": 0, "avg_5d": 0, "spike_ratio": 0,
            "dominant_side": "NEUTRAL", "source": "unavailable"
        }

    # Last 6 buckets ≈ 24 hours = "today"
    today_buckets = rows[-6:]
    hist_buckets  = rows[:-6] if len(rows) > 6 else rows

    today_liq   = sum(r["total_liq_usd"]  for r in today_buckets)
    today_long  = sum(r["long_liq_usd"]   for r in today_buckets)
    today_short = sum(r["short_liq_usd"]  for r in today_buckets)

    avg_per_6h  = sum(r["total_liq_usd"] for r in hist_buckets) / max(len(hist_buckets), 1)
    avg_5d      = avg_per_6h * 6  # scale to 24h equivalent

    spike_ratio = today_liq / avg_5d if avg_5d > 0 else 0

    # More long liquidations → price dropped sharply → BEARISH cascade (but can signal bounce)
    dominant_side = "BEARISH" if today_long > today_short else "BULLISH"

    return {
        "today_liq":     today_liq,
        "avg_5d":        avg_5d,
        "spike_ratio":   spike_ratio,
        "dominant_side": dominant_side,
        "long_liq":      today_long,
        "short_liq":     today_short,
        "source":        "coinglass",
    }
