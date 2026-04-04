"""
Daily signal report email via Resend API.
Sent at 06:00 UTC after all signals have been generated and augmented.
"""

import logging
import requests
from datetime import datetime, timezone
from config import RESEND_API_KEY, ADMIN_EMAIL, FROM_EMAIL

log = logging.getLogger(__name__)


def _send(subject: str, html: str) -> bool:
    if not RESEND_API_KEY:
        log.warning("RESEND_API_KEY not set — skipping email")
        return False
    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        json={"from": FROM_EMAIL, "to": [ADMIN_EMAIL], "subject": subject, "html": html},
        timeout=15,
    )
    if not r.ok:
        log.error("Resend error: %s", r.text)
        return False
    log.info("Daily signal report sent to %s", ADMIN_EMAIL)
    return True


def build_report(signals: list[dict], executions: list[dict],
                 exec_stats: list[dict]) -> str:
    """
    Build HTML email body.
    signals:    list of onchain_signals rows with nested confirmations + executions
    executions: today's signal_executions
    exec_stats: closed signal_executions from last 7 days (for win-rate table)
    """
    date_str  = datetime.now(timezone.utc).strftime("%d %b %Y")
    now_str   = datetime.now(timezone.utc).strftime("%H:%M UTC")

    def pct(v):
        if v is None: return "—"
        return f"{v:+.2f}%"

    def conf(v):
        return f"{round(v * 100)}%" if v else "—"

    # ── Signal rows ───────────────────────────────────────────────────────────
    signal_rows = ""
    for sig in signals:
        sig_type  = sig.get("signal_type", "").replace("_", " ").title()
        asset     = sig.get("asset", "")
        confidence = sig.get("confidence_score", 0)
        direction  = sig.get("direction", "")
        data       = sig.get("signal_data", {})

        confirmations = sig.get("signal_strategy_confirmations", []) or \
                        sig.get("confirmations", [])
        conf_rows = ""
        for c in confirmations:
            met  = c.get("strategy_condition_met", False)
            tick = "✓" if met else "✗"
            col  = "#16A34A" if met else "#DC2626"
            s    = c.get("strategy_name", "").replace("_", " ").title()
            bc   = c.get("strategy_confidence")
            bst  = c.get("signal_boosted_confidence")
            boost = c.get("boost_amount", 0)
            boost_str = f"{boost:+.2f}" if boost else ""
            execute_note = " — <strong>auto-execute</strong>" if (bst or 0) >= 0.80 and met else ""
            conf_rows += f"""
            <tr>
              <td style="padding:4px 8px;color:{col};font-weight:600">{tick}</td>
              <td style="padding:4px 8px">{s}</td>
              <td style="padding:4px 8px;color:#6A6A6A">{conf(bc)} → {conf(bst)} {boost_str}{execute_note}</td>
            </tr>"""

        signal_rows += f"""
        <tr style="border-top:1px solid #EBEBEA">
          <td style="padding:14px;vertical-align:top">
            <div style="font-weight:600;font-size:13px;color:#1A1A1A">{sig_type} — {asset}</div>
            <div style="font-size:11px;color:#8A8A8A;margin-top:3px">
              Confidence: <strong>{conf(confidence)}</strong> &nbsp;|&nbsp;
              Direction: <strong style="color:{'#16A34A' if direction=='BULLISH' else '#DC2626' if direction=='BEARISH' else '#A0A0A0'}">{direction}</strong>
            </div>
            <table style="margin-top:8px;width:100%;border-collapse:collapse;font-size:12px">
              {conf_rows}
            </table>
          </td>
        </tr>"""

    if not signal_rows:
        signal_rows = '<tr><td style="padding:20px;color:#A0A0A0;text-align:center">No signals generated today</td></tr>'

    # ── Execution rows ────────────────────────────────────────────────────────
    exec_rows = ""
    for ex in executions:
        side  = ex.get("side", "")
        color = "#16A34A" if side == "BUY" else "#DC2626"
        exec_rows += f"""
        <tr style="border-top:1px solid #EBEBEA">
          <td style="padding:10px 14px;font-size:12px">
            <span style="font-weight:700;color:{color}">[{side}]</span>
            {ex.get('asset','')} via {ex.get('execution_strategy','').replace('_',' ').title()}
            @ ${ex.get('entry_price',0):,.4f}
            (size: ${ex.get('size',0):,.2f})
            &nbsp;|&nbsp; Stop: ${ex.get('stop_loss',0):,.4f}
            &nbsp;|&nbsp; Target: ${ex.get('take_profit',0):,.4f}
          </td>
        </tr>"""

    if not exec_rows:
        exec_rows = '<tr><td style="padding:14px;color:#A0A0A0;text-align:center">No executions today</td></tr>'

    # ── Performance table ─────────────────────────────────────────────────────
    from collections import defaultdict
    stats: dict = defaultdict(lambda: {"wins": 0, "losses": 0, "total": 0, "win_pnl": [], "loss_pnl": []})
    for ex in exec_stats:
        s = ex.get("execution_strategy", "unknown")
        pnl = ex.get("pnl_pct")
        stats[s]["total"] += 1
        if pnl and pnl > 0:
            stats[s]["wins"] += 1
            stats[s]["win_pnl"].append(pnl)
        elif pnl is not None:
            stats[s]["losses"] += 1
            stats[s]["loss_pnl"].append(abs(pnl))

    perf_rows = ""
    for strategy, s in stats.items():
        wr  = s["wins"] / s["total"] * 100 if s["total"] > 0 else 0
        aw  = sum(s["win_pnl"])  / len(s["win_pnl"])  if s["win_pnl"]  else 0
        al  = sum(s["loss_pnl"]) / len(s["loss_pnl"]) if s["loss_pnl"] else 0
        perf_rows += f"""
        <tr style="border-top:1px solid #EBEBEA;font-size:12px">
          <td style="padding:8px 14px">{strategy.replace('_',' ').title()}</td>
          <td style="padding:8px 14px;text-align:right">{s['total']}</td>
          <td style="padding:8px 14px;text-align:right;color:{'#16A34A' if wr>=60 else '#DC2626'}">{wr:.0f}%</td>
          <td style="padding:8px 14px;text-align:right;color:#16A34A">+{aw:.2f}%</td>
          <td style="padding:8px 14px;text-align:right;color:#DC2626">-{al:.2f}%</td>
        </tr>"""

    if not perf_rows:
        perf_rows = '<tr><td colspan="5" style="padding:14px;color:#A0A0A0;text-align:center">No closed trades in last 7 days</td></tr>'

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8F8F6;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F8F6;padding:32px 16px">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #EBEBEA;overflow:hidden">

  <!-- Header -->
  <tr>
    <td style="background:#fff;padding:28px 32px;border-bottom:1px solid #EBEBEA">
      <table width="100%">
        <tr>
          <td>
            <div style="font-size:18px;font-weight:600;color:#1A1A1A;letter-spacing:-0.3px">Artery Capital</div>
            <div style="font-size:11px;color:#A0A0A0;margin-top:2px">Wealth Builder · On-Chain Signal Report</div>
          </td>
          <td align="right">
            <span style="background:#FF5A5F;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:0.5px">LIVE</span>
            <div style="font-size:11px;color:#A0A0A0;margin-top:4px">{date_str} · {now_str}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Signals -->
  <tr>
    <td style="padding:24px 32px 0">
      <div style="font-size:10px;font-weight:700;color:#A0A0A0;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px">
        On-Chain Signals (24hr)
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        {signal_rows}
      </table>
    </td>
  </tr>

  <!-- Executions -->
  <tr>
    <td style="padding:24px 32px 0">
      <div style="font-size:10px;font-weight:700;color:#A0A0A0;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px">
        Executions
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        {exec_rows}
      </table>
    </td>
  </tr>

  <!-- Performance -->
  <tr>
    <td style="padding:24px 32px">
      <div style="font-size:10px;font-weight:700;color:#A0A0A0;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px">
        Signal Performance (Last 7 days)
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:11px">
        <tr style="color:#A0A0A0">
          <th style="padding:6px 14px;text-align:left;font-weight:600">Strategy</th>
          <th style="padding:6px 14px;text-align:right;font-weight:600">Trades</th>
          <th style="padding:6px 14px;text-align:right;font-weight:600">Win Rate</th>
          <th style="padding:6px 14px;text-align:right;font-weight:600">Avg Win</th>
          <th style="padding:6px 14px;text-align:right;font-weight:600">Avg Loss</th>
        </tr>
        {perf_rows}
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:20px 32px;border-top:1px solid #EBEBEA;background:#FAFAF9">
      <table width="100%">
        <tr>
          <td style="font-size:11px;color:#C0C0C0">
            Artery Capital Wealth Builder · invest@arterycapital.co.za
          </td>
          <td align="right">
            <a href="https://arterycapital.co.za/trading"
               style="font-size:11px;color:#FF5A5F;text-decoration:none;font-weight:600">
              View Dashboard →
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def send_daily_report(signals: list[dict], executions: list[dict],
                      exec_stats: list[dict]) -> bool:
    date_str = datetime.now(timezone.utc).strftime("%d %b %Y")
    subject  = f"Artery On-Chain Signals — {date_str}"
    html     = build_report(signals, executions, exec_stats)
    return _send(subject, html)
