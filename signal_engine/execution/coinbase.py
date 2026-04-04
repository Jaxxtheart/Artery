"""
Coinbase Advanced Trading API execution layer.
Re-uses the same API key pair as the Node.js app (env vars are shared).
"""

import logging
import time
import hmac
import hashlib
import json
import requests
from datetime import datetime, timezone
from config import COINBASE_API_KEY, COINBASE_API_SECRET

log = logging.getLogger(__name__)

BASE = "https://api.coinbase.com"


def _sign(method: str, path: str, body: str = "") -> dict:
    timestamp = str(int(time.time()))
    message   = timestamp + method.upper() + path + body
    signature = hmac.new(
        COINBASE_API_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()
    return {
        "CB-ACCESS-KEY":       COINBASE_API_KEY,
        "CB-ACCESS-SIGN":      signature,
        "CB-ACCESS-TIMESTAMP": timestamp,
        "Content-Type":        "application/json",
    }


def _request(method: str, path: str, payload: dict = None) -> dict:
    body    = json.dumps(payload) if payload else ""
    headers = _sign(method, path, body)
    url     = BASE + path
    r = requests.request(method, url, headers=headers,
                          data=body if body else None, timeout=15)
    r.raise_for_status()
    return r.json()


def get_portfolio() -> list[dict]:
    """Return all accounts with non-zero balance."""
    data = _request("GET", "/api/v3/brokerage/accounts")
    accounts = data.get("accounts", [])
    return [
        {
            "currency":  a["currency"],
            "balance":   float(a["available_balance"]["value"]),
            "type":      "cash" if a["currency"] in ("USD", "USDC") else "crypto",
            "value_usd": float(a.get("value_usd", 0)),
        }
        for a in accounts
        if float(a["available_balance"]["value"]) > 0
    ]


def get_price(symbol: str) -> float:
    """e.g. symbol = 'BTC-USD'"""
    data = _request("GET", f"/api/v3/brokerage/best_bid_ask?product_ids={symbol}")
    p    = data.get("pricebooks", [{}])[0]
    best_ask = float(p.get("asks", [{}])[0].get("price", 0))
    best_bid = float(p.get("bids", [{}])[0].get("price", 0))
    return (best_ask + best_bid) / 2 if best_ask and best_bid else best_ask or best_bid


def get_product_details(symbol: str) -> dict:
    """Fetch product info including base_increment for precision."""
    return _request("GET", f"/api/v3/brokerage/products/{symbol}")


def place_market_buy(symbol: str, quote_size: float) -> dict:
    """
    Market BUY using quote_size (USD amount to spend).
    Returns Coinbase order response.
    """
    payload = {
        "client_order_id": f"artery-signal-{int(time.time())}",
        "product_id":      symbol,
        "side":            "BUY",
        "order_configuration": {
            "market_market_ioc": {
                "quote_size": str(round(quote_size, 2))
            }
        }
    }
    log.info("Placing BUY %s quote_size=$%.2f", symbol, quote_size)
    return _request("POST", "/api/v3/brokerage/orders", payload)


def place_market_sell(symbol: str, base_size: float, base_increment: str = "0.00000001") -> dict:
    """
    Market SELL using base_size (crypto units), rounded to product precision.
    """
    decimals   = len((base_increment.split(".")[1] if "." in base_increment else ""))
    rounded    = round(base_size * 0.999, decimals)  # trim 0.1% for rounding safety
    payload = {
        "client_order_id": f"artery-signal-sell-{int(time.time())}",
        "product_id":      symbol,
        "side":            "SELL",
        "order_configuration": {
            "market_market_ioc": {
                "base_size": str(rounded)
            }
        }
    }
    log.info("Placing SELL %s base_size=%s", symbol, rounded)
    return _request("POST", "/api/v3/brokerage/orders", payload)


def execute_signal(asset: str, direction: str, position_size_usd: float) -> dict:
    """
    Place an order for a signal-engine execution.
    direction: BUY | SELL
    Returns { success, order_id, price, size, error? }
    """
    symbol = f"{asset}-USD"

    try:
        price = get_price(symbol)
        if price <= 0:
            return {"success": False, "error": "Could not fetch price"}

        if direction == "BUY":
            resp     = place_market_buy(symbol, position_size_usd)
        else:
            product  = get_product_details(symbol)
            base_inc = product.get("base_increment", "0.00000001")
            # For SELL, calculate how many units we can sell with the position size
            units    = position_size_usd / price
            resp     = place_market_sell(symbol, units, base_inc)

        order_id = (resp.get("success_response") or {}).get("order_id") or resp.get("order_id")
        success  = bool(order_id)

        if not success:
            err_resp = resp.get("error_response") or {}
            reason   = (err_resp.get("preview_failure_reason") or
                        err_resp.get("new_order_failure_reason") or
                        err_resp.get("message") or str(resp))
            log.error("Order failed for %s %s: %s", direction, symbol, reason)
            return {"success": False, "error": reason, "raw": resp}

        return {
            "success":  True,
            "order_id": order_id,
            "price":    price,
            "size_usd": position_size_usd,
        }

    except Exception as e:
        log.exception("execute_signal error for %s %s", direction, asset)
        return {"success": False, "error": str(e)}


def get_open_positions_count() -> int:
    """Count open positions from Coinbase portfolio (approximate via non-USD balances)."""
    try:
        portfolio = get_portfolio()
        return sum(1 for a in portfolio if a["type"] == "crypto" and a["value_usd"] > 10)
    except Exception:
        return 0
