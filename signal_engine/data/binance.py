"""
Binance public API client.
Provides: OHLCV candles, funding rates, open interest, liquidation proxies.
No API key required for market data endpoints.
"""

import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Optional
import requests

log = logging.getLogger(__name__)

BASE_SPOT    = "https://api.binance.com"
BASE_FUTURES = "https://fapi.binance.com"
TIMEOUT      = 15  # seconds


def _get(url: str, params: dict = None) -> dict | list:
    r = requests.get(url, params=params, timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()


def get_klines(symbol: str, interval: str = "1d", limit: int = 60) -> list[dict]:
    """
    Fetch OHLCV candles from Binance spot.
    symbol: "BTCUSDT" | "ETHUSDT"
    interval: "1h" | "4h" | "1d"
    Returns list of dicts with open, high, low, close, volume, timestamp.
    """
    raw = _get(f"{BASE_SPOT}/api/v3/klines", {
        "symbol": symbol, "interval": interval, "limit": limit
    })
    return [
        {
            "timestamp": r[0] / 1000,  # epoch seconds
            "open":      float(r[1]),
            "high":      float(r[2]),
            "low":       float(r[3]),
            "close":     float(r[4]),
            "volume":    float(r[5]),
        }
        for r in raw
    ]


def get_current_price(symbol: str) -> float:
    """Latest spot price."""
    data = _get(f"{BASE_SPOT}/api/v3/ticker/price", {"symbol": symbol})
    return float(data["price"])


def get_funding_rate(symbol: str = "BTCUSDT") -> float:
    """
    Latest perpetual futures funding rate.
    Returns a float e.g. 0.0001 = 0.01% per 8 hours.
    """
    data = _get(f"{BASE_FUTURES}/fapi/v1/premiumIndex", {"symbol": symbol})
    return float(data.get("lastFundingRate", 0))


def get_open_interest(symbol: str = "BTCUSDT") -> float:
    """Futures open interest in USD."""
    data = _get(f"{BASE_FUTURES}/fapi/v1/openInterest", {"symbol": symbol})
    oi_qty   = float(data.get("openInterest", 0))
    price    = get_current_price(symbol)
    return oi_qty * price


def get_large_trades(symbol: str = "BTCUSDT", limit: int = 500) -> list[dict]:
    """
    Aggregate trades — used as a proxy for large/whale activity.
    Returns list of { price, qty, isBuyerMaker, time }.
    """
    raw = _get(f"{BASE_SPOT}/api/v3/aggTrades", {"symbol": symbol, "limit": limit})
    return [
        {
            "price":         float(r["p"]),
            "qty":           float(r["q"]),
            "is_buyer_maker": r["m"],
            "time":          r["T"] / 1000,
        }
        for r in raw
    ]


def estimate_exchange_flow(symbol: str = "BTCUSDT", lookback_hours: int = 24) -> dict:
    """
    Estimate exchange flow from large trade imbalance.
    This is an approximation — real exchange flow data requires Glassnode/CryptoQuant.

    Logic:
      - Buy-side large trades → crypto flowing INTO exchanges (sell pressure)
      - Sell-side large trades → crypto flowing OUT of exchanges (accumulation signal)

    Returns: { inflow_usd, outflow_usd, net_flow, whale_tx_count }
    """
    try:
        trades = get_large_trades(symbol, limit=1000)
        price  = get_current_price(symbol)

        # Threshold: trades > $50k USD considered "whale"
        WHALE_THRESHOLD_USD = 50_000

        inflow_usd  = 0.0
        outflow_usd = 0.0
        whale_count = 0

        for t in trades:
            usd_value = t["qty"] * t["price"]
            if usd_value < WHALE_THRESHOLD_USD:
                continue
            whale_count += 1
            if t["is_buyer_maker"]:
                # Buyer is market maker → sell order filled → outflow (accumulation)
                outflow_usd += usd_value
            else:
                inflow_usd += usd_value

        return {
            "inflow_usd":     inflow_usd,
            "outflow_usd":    outflow_usd,
            "net_flow":       outflow_usd - inflow_usd,  # positive = net outflow (bullish)
            "whale_tx_count": whale_count,
            "source":         "binance_trade_proxy",
        }
    except Exception as e:
        log.warning("estimate_exchange_flow failed for %s: %s", symbol, e)
        return {"inflow_usd": 0, "outflow_usd": 0, "net_flow": 0, "whale_tx_count": 0, "source": "unavailable"}


def calculate_realized_vol(symbol: str = "BTCUSDT", days: int = 30) -> dict:
    """
    Realized volatility from daily log returns, annualised.
    Returns { realized_vol_30d, realized_vol_7d, realized_vol_1d }
    """
    import numpy as np
    try:
        klines = get_klines(symbol, "1d", limit=max(days + 2, 33))
        closes = [k["close"] for k in klines]

        log_returns = np.diff(np.log(closes))
        vol_30d = float(np.std(log_returns[-30:]) * np.sqrt(365)) if len(log_returns) >= 30 else None
        vol_7d  = float(np.std(log_returns[-7:])  * np.sqrt(365)) if len(log_returns) >= 7  else None
        vol_1d  = float(np.std(log_returns[-2:])  * np.sqrt(365)) if len(log_returns) >= 2  else None

        return {
            "realized_vol_30d": vol_30d,
            "realized_vol_7d":  vol_7d,
            "realized_vol_1d":  vol_1d,
            "source":           "binance_ohlcv",
        }
    except Exception as e:
        log.warning("calculate_realized_vol failed for %s: %s", symbol, e)
        return {"realized_vol_30d": None, "realized_vol_7d": None, "realized_vol_1d": None, "source": "unavailable"}
