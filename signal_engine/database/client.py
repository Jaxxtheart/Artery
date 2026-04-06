"""
Supabase client wrapper for the signal engine.
Handles all DB reads/writes and Realtime broadcasting.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

log = logging.getLogger(__name__)

_client: Optional[Client] = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


# ── Thresholds ────────────────────────────────────────────────────────────────

def get_thresholds(signal_type: str, asset: str) -> dict:
    """Return tunable thresholds for a signal type/asset pair."""
    db = get_client()
    res = db.table("signal_thresholds") \
            .select("threshold_key, threshold_value") \
            .eq("signal_type", signal_type) \
            .eq("asset", asset) \
            .eq("active", True) \
            .execute()
    return {r["threshold_key"]: r["threshold_value"] for r in (res.data or [])}


# ── Market data snapshots ─────────────────────────────────────────────────────

def upsert_market_snapshot(snapshot: dict) -> dict:
    db = get_client()
    snapshot["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = db.table("market_data_snapshots") \
            .upsert(snapshot, on_conflict="data_date,asset") \
            .execute()
    return res.data[0] if res.data else {}


def get_recent_snapshots(asset: str, days: int = 30) -> list[dict]:
    db = get_client()
    res = db.table("market_data_snapshots") \
            .select("*") \
            .eq("asset", asset) \
            .order("data_date", desc=True) \
            .limit(days) \
            .execute()
    return res.data or []


# ── Signals ───────────────────────────────────────────────────────────────────

def insert_signal(signal: dict) -> dict:
    db = get_client()
    res = db.table("onchain_signals").insert(signal).execute()
    row = res.data[0] if res.data else {}
    if row:
        log.info("Signal stored: %s %s %.2f", signal["signal_type"], signal["asset"],
                 signal["confidence_score"])
    return row


def get_active_signals(asset: Optional[str] = None) -> list[dict]:
    """Return signals that have not yet expired."""
    db = get_client()
    now = datetime.now(timezone.utc).isoformat()
    q = db.table("onchain_signals") \
          .select("*") \
          .or_(f"expires_at.is.null,expires_at.gt.{now}")
    if asset:
        q = q.eq("asset", asset)
    return q.order("signal_date", desc=True).execute().data or []


# ── Confirmations ─────────────────────────────────────────────────────────────

def insert_confirmation(confirmation: dict) -> dict:
    db = get_client()
    res = db.table("signal_strategy_confirmations").insert(confirmation).execute()
    return res.data[0] if res.data else {}


def get_confirmations_for_signal(signal_id: str) -> list[dict]:
    db = get_client()
    return db.table("signal_strategy_confirmations") \
             .select("*") \
             .eq("signal_id", signal_id) \
             .execute().data or []


# ── Signal executions ─────────────────────────────────────────────────────────

def insert_execution(execution: dict) -> dict:
    db = get_client()
    res = db.table("signal_executions").insert(execution).execute()
    return res.data[0] if res.data else {}


def get_open_signal_executions() -> list[dict]:
    db = get_client()
    return db.table("signal_executions") \
             .select("*") \
             .eq("status", "OPEN") \
             .execute().data or []


def close_signal_execution(exec_id: str, exit_price: float,
                            pnl: float, pnl_pct: float) -> dict:
    db = get_client()
    res = db.table("signal_executions").update({
        "exit_price": exit_price,
        "exit_time":  datetime.now(timezone.utc).isoformat(),
        "pnl":        pnl,
        "pnl_pct":    pnl_pct,
        "status":     "CLOSED",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", exec_id).execute()
    return res.data[0] if res.data else {}


# ── Historical query for backtesting / reporting ──────────────────────────────

def get_signals_since(hours: int = 24) -> list[dict]:
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    db = get_client()
    return db.table("onchain_signals") \
             .select("*, signal_strategy_confirmations(*), signal_executions(*)") \
             .gte("signal_date", cutoff) \
             .order("signal_date", desc=True) \
             .execute().data or []


def get_execution_stats(days: int = 7) -> list[dict]:
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    db = get_client()
    return db.table("signal_executions") \
             .select("*") \
             .eq("status", "CLOSED") \
             .gte("entry_time", cutoff) \
             .execute().data or []


# ── Realtime broadcast ────────────────────────────────────────────────────────

def broadcast_signal(signal_row: dict) -> None:
    """
    Broadcast a new signal to the Supabase Realtime channel
    `trading:signals:{ASSET}` so the dashboard receives it live.
    Uses HTTP POST to the Realtime broadcast endpoint directly,
    which works without a persistent websocket connection.
    """
    import requests
    from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

    asset   = signal_row.get("asset", "BTC")
    channel = f"trading:signals:{asset}"
    url     = f"{SUPABASE_URL}/realtime/v1/api/broadcast"

    payload = {
        "messages": [{
            "topic":   channel,
            "event":   "new_signal",
            "payload": {
                "signal_type":    signal_row["signal_type"],
                "asset":          asset,
                "confidence":     signal_row["confidence_score"],
                "direction":      signal_row["direction"],
                "signal_data":    signal_row.get("signal_data", {}),
                "signal_id":      signal_row.get("id"),
            },
        }]
    }
    headers = {
        "apikey":        SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type":  "application/json",
    }
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=10)
        r.raise_for_status()
        log.debug("Broadcast sent to channel %s", channel)
    except Exception as e:
        log.warning("Realtime broadcast failed (non-fatal): %s", e)
