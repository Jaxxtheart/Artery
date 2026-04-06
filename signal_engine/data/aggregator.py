"""
Data aggregator — pulls from all sources and returns a normalised
MarketData snapshot for a given asset.

Priority fallback chain per field:
  exchange_outflow   → Glassnode (if key set) → CryptoQuant → Binance trade proxy
  realized_vol       → Binance OHLCV (always available)
  stablecoin_inflow  → CoinGecko market cap delta
  liquidation_volume → CoinGlass
  funding_rate       → Binance perpetuals
"""

import logging
from datetime import date
from typing import Optional
from dataclasses import dataclass, field

from data.binance    import estimate_exchange_flow, calculate_realized_vol, \
                            get_funding_rate, get_open_interest, get_current_price
from data.coingecko  import get_stablecoin_flow_series
from data.coinglass  import get_liquidation_summary

log = logging.getLogger(__name__)

# Mapping: asset symbol → Binance spot symbol
BINANCE_SYMBOL = {"BTC": "BTCUSDT", "ETH": "ETHUSDT"}
FUTURES_SYMBOL = {"BTC": "BTCUSDT", "ETH": "ETHUSDT"}


@dataclass
class MarketData:
    asset:              str
    data_date:          str              # ISO date string
    price_close:        float = 0.0
    volume_24h:         float = 0.0

    # Exchange flow
    exchange_inflow:    float = 0.0
    exchange_outflow:   float = 0.0
    whale_transactions: int   = 0

    # Volatility
    realized_vol_30d:   Optional[float] = None
    realized_vol_7d:    Optional[float] = None
    realized_vol_1d:    Optional[float] = None

    # Funding / OI
    funding_rate:       float = 0.0
    open_interest:      float = 0.0

    # Stablecoin
    stablecoin_inflow_today: float = 0.0
    stablecoin_7d_series:    list  = field(default_factory=list)

    # Liquidations
    liquidation_today:  float = 0.0
    liquidation_5d_avg: float = 0.0
    liquidation_spike:  float = 0.0
    liquidation_side:   str   = "NEUTRAL"

    # Provenance
    data_sources:       dict  = field(default_factory=dict)


def fetch(asset: str) -> MarketData:
    """
    Fetch all market data for an asset and return a MarketData object.
    Each data source is fetched independently; failures are logged but
    don't abort the overall fetch.
    """
    sym     = BINANCE_SYMBOL.get(asset, f"{asset}USDT")
    fsym    = FUTURES_SYMBOL.get(asset, f"{asset}USDT")
    md      = MarketData(asset=asset, data_date=date.today().isoformat())
    sources = {}

    # ── Price ────────────────────────────────────────────────────────────────
    try:
        md.price_close = get_current_price(sym)
        sources["price"] = "binance_spot"
    except Exception as e:
        log.warning("[%s] price fetch failed: %s", asset, e)

    # ── Exchange flow (Binance large-trade proxy) ─────────────────────────────
    try:
        flow = estimate_exchange_flow(sym)
        md.exchange_inflow    = flow["inflow_usd"]
        md.exchange_outflow   = flow["outflow_usd"]
        md.whale_transactions = flow["whale_tx_count"]
        sources["exchange_flow"] = flow["source"]
    except Exception as e:
        log.warning("[%s] exchange flow failed: %s", asset, e)

    # ── Realized volatility ───────────────────────────────────────────────────
    try:
        vols = calculate_realized_vol(sym, days=32)
        md.realized_vol_30d = vols["realized_vol_30d"]
        md.realized_vol_7d  = vols["realized_vol_7d"]
        md.realized_vol_1d  = vols["realized_vol_1d"]
        sources["realized_vol"] = vols["source"]
    except Exception as e:
        log.warning("[%s] realized vol failed: %s", asset, e)

    # ── Funding rate ──────────────────────────────────────────────────────────
    try:
        md.funding_rate  = get_funding_rate(fsym)
        md.open_interest = get_open_interest(fsym)
        sources["funding"] = "binance_futures"
    except Exception as e:
        log.warning("[%s] funding rate failed: %s", asset, e)

    # ── Stablecoin flows (CoinGecko — shared signal, same for BTC + ETH) ─────
    try:
        flow_series = get_stablecoin_flow_series(days=9)
        md.stablecoin_7d_series    = flow_series[-7:] if len(flow_series) >= 7 else flow_series
        md.stablecoin_inflow_today = flow_series[-1] if flow_series else 0.0
        sources["stablecoin"] = "coingecko_mcap_delta"
    except Exception as e:
        log.warning("[%s] stablecoin flow failed: %s", asset, e)

    # ── Liquidations ──────────────────────────────────────────────────────────
    try:
        liq = get_liquidation_summary(asset)
        md.liquidation_today  = liq["today_liq"]
        md.liquidation_5d_avg = liq["avg_5d"]
        md.liquidation_spike  = liq["spike_ratio"]
        md.liquidation_side   = liq["dominant_side"]
        sources["liquidations"] = liq["source"]
    except Exception as e:
        log.warning("[%s] liquidation data failed: %s", asset, e)

    md.data_sources = sources
    log.info("[%s] market data fetched — sources: %s", asset, list(sources.keys()))
    return md


def to_db_row(md: MarketData) -> dict:
    """Convert a MarketData object to a dict for market_data_snapshots table."""
    return {
        "data_date":          md.data_date,
        "asset":              md.asset,
        "exchange_inflow":    md.exchange_inflow,
        "exchange_outflow":   md.exchange_outflow,
        "whale_transactions": md.whale_transactions,
        "realized_vol":       md.realized_vol_30d,
        "funding_rate":       md.funding_rate,
        "stablecoin_inflow":  md.stablecoin_inflow_today,
        "liquidation_volume": md.liquidation_today,
        "open_interest":      md.open_interest,
        "price_close":        md.price_close,
        "data_sources":       md.data_sources,
    }
