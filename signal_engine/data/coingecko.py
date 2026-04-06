"""
CoinGecko free API client.
Provides: stablecoin market cap history (USDT, USDC) as stablecoin flow proxy.
Rate limit: 10-30 calls/min on free tier.
"""

import logging
import time
import requests

log = logging.getLogger(__name__)

BASE = "https://api.coingecko.com/api/v3"
TIMEOUT = 20

# Stablecoins to aggregate for "stablecoin inflow" proxy
STABLECOINS = {
    "tether":        "USDT",
    "usd-coin":      "USDC",
    "dai":           "DAI",
}


def _get(path: str, params: dict = None, retries: int = 3) -> dict | list:
    for attempt in range(retries):
        try:
            r = requests.get(f"{BASE}{path}", params=params, timeout=TIMEOUT)
            if r.status_code == 429:
                wait = 2 ** attempt * 10
                log.warning("CoinGecko rate limit — waiting %ds", wait)
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.json()
        except requests.exceptions.RequestException as e:
            if attempt == retries - 1:
                raise
            time.sleep(2 ** attempt)
    return {}


def get_stablecoin_market_caps(days: int = 10) -> dict:
    """
    Fetch USDT + USDC market cap history.
    Returns { date: total_mcap_usd } for the last `days` days.
    Market cap change ≈ net stablecoin minting/burning = proxy for on-exchange dry powder.
    """
    combined: dict[str, float] = {}

    for coin_id, ticker in STABLECOINS.items():
        try:
            data = _get(f"/coins/{coin_id}/market_chart", {
                "vs_currency": "usd",
                "days":        days,
                "interval":    "daily",
            })
            for ts_ms, mcap in data.get("market_caps", []):
                date_str = str(ts_ms // 86400000)  # day bucket
                combined[date_str] = combined.get(date_str, 0) + mcap
            time.sleep(1.5)  # respect free tier rate limit
        except Exception as e:
            log.warning("CoinGecko market cap fetch failed for %s: %s", ticker, e)

    return combined


def get_stablecoin_flow_series(days: int = 10) -> list[float]:
    """
    Calculate day-over-day change in aggregate stablecoin market cap.
    Positive value = net minting → more dry powder = bullish signal.
    Returns list of daily inflow/outflow values (most recent last).
    """
    mcaps = get_stablecoin_market_caps(days=days + 2)
    if not mcaps:
        return []

    sorted_days = sorted(mcaps.keys())
    series = [mcaps[d] for d in sorted_days]
    flows  = [series[i] - series[i - 1] for i in range(1, len(series))]
    return flows[-days:]


def get_price_and_volume(asset: str = "bitcoin", days: int = 8) -> dict:
    """
    Fallback price/volume data from CoinGecko when Binance is unavailable.
    asset: 'bitcoin' | 'ethereum'
    """
    try:
        data = _get(f"/coins/{asset}/market_chart", {
            "vs_currency": "usd",
            "days":        days,
            "interval":    "daily",
        })
        prices  = [p[1] for p in data.get("prices", [])]
        volumes = [v[1] for v in data.get("total_volumes", [])]
        return {"prices": prices, "volumes": volumes}
    except Exception as e:
        log.warning("CoinGecko price fetch failed for %s: %s", asset, e)
        return {"prices": [], "volumes": []}
