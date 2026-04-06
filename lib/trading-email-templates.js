/**
 * Trading Email Templates
 * HTML email reports for daily trading summary
 * Design matches the Artery Capital Wealth Builder dashboard
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jaxxtheart@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - skipping email');
    return null;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Artery Capital Trading <trading@arterycapital.co.za>', to: [to], subject, html })
  });
  if (!response.ok) throw new Error(`Resend API error: ${await response.text()}`);
  return response.json();
}

const fmt     = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const pnlClr  = (v) => v >= 0 ? '#16A34A' : '#DC2626';
const pnlSign = (v) => v >= 0 ? '+' : '';

// ── Shared design tokens ──────────────────────────────────────────────────────
const C = {
  red:     '#FF5A5F',
  redDark: '#E34850',
  bg:      '#F8F8F6',
  white:   '#FFFFFF',
  border:  '#EBEBEA',
  text:    '#1A1A1A',
  muted:   '#6A6A6A',
  faint:   '#A0A0A0',
  cardBg:  '#FFFFFF',
};

// ── Logo SVG (inline — renders in Gmail, Apple Mail, Outlook web) ─────────────
const LOGO_SVG = `
<svg viewBox="0 0 500 160" xmlns="http://www.w3.org/2000/svg" width="200" height="64">
  <defs>
    <linearGradient id="fg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF5A5F;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#E34850;stop-opacity:1"/>
    </linearGradient>
  </defs>
  <circle cx="85" cy="80" r="55" fill="none" stroke="#FF5A5F" stroke-width="2" opacity="0.25"/>
  <g transform="translate(40,45)">
    <path d="M 20 55 C 20 40, 25 25, 35 15 C 40 8, 45 8, 50 15 C 55 22, 57 30, 55 40 L 50 52 M 30 52 C 32 35, 38 28, 45 28 C 52 28, 58 35, 60 52 M 30 52 C 30 58, 32 62, 35 65 C 40 70, 50 70, 55 65 C 58 62, 60 58, 60 52"
      stroke="url(#fg)" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 35 15 Q 25 12, 18 18" stroke="#FF5A5F" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.5"/>
    <path d="M 50 15 Q 60 12, 67 18" stroke="#FF5A5F" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.5"/>
  </g>
  <text x="160" y="72" font-family="'Helvetica Neue',Arial,sans-serif" font-size="38" font-weight="500" fill="#2C2C2C" letter-spacing="1">Artery Capital</text>
  <path d="M 160 82 L 440 82" stroke="#FF5A5F" stroke-width="1.5" opacity="0.3"/>
  <text x="161" y="104" font-family="'Helvetica Neue',Arial,sans-serif" font-size="15" fill="#A0A0A0" letter-spacing="0.5">Wealth Builder  ·  Algorithmic Trading</text>
</svg>`;

// ── Metric card (table-safe) ──────────────────────────────────────────────────
function metricCard(label, value, sub = '', subColor = C.faint) {
  return `
  <td style="width:25%;padding:0 6px;">
    <table role="presentation" style="width:100%;background:${C.white};border:1px solid ${C.border};border-radius:10px;border-collapse:collapse;">
      <tr><td style="padding:16px 18px;">
        <div style="font-size:9px;font-weight:600;color:${C.faint};letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">${label}</div>
        <div style="font-size:20px;font-weight:700;color:${C.text};">${value}</div>
        ${sub ? `<div style="font-size:12px;color:${subColor};margin-top:3px;">${sub}</div>` : ''}
      </td></tr>
    </table>
  </td>`;
}

// ── Confidence bar ────────────────────────────────────────────────────────────
function confBar(pct) {
  const color = pct >= 80 ? '#16A34A' : pct >= 65 ? '#D97706' : '#A0A0A0';
  return `
  <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:2px;">
    <tr>
      <td style="background:#F0F0EE;border-radius:999px;height:4px;overflow:hidden;">
        <table role="presentation" style="width:${pct}%;height:4px;border-collapse:collapse;">
          <tr><td style="background:${color};border-radius:999px;"></td></tr>
        </table>
      </td>
      <td style="width:32px;text-align:right;font-size:10px;color:${C.faint};padding-left:6px;">${pct}%</td>
    </tr>
  </table>`;
}

// ── Section heading ───────────────────────────────────────────────────────────
function sectionHead(title) {
  return `<div style="font-size:10px;font-weight:600;color:${C.faint};letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;">${title}</div>`;
}

async function sendDailyTradingReport({ portfolio, signals, executedTrades, closedPositions, log }) {
  const { totalValue, cashBalance } = portfolio;
  const initialCapital = parseFloat(process.env.INITIAL_CAPITAL || '1441');
  const target         = 2441;
  const totalPnL       = totalValue - initialCapital;
  const totalPnLPct    = (totalPnL / initialCapital) * 100;
  const progressPct    = Math.min((totalValue / target) * 100, 100).toFixed(1);
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const buySignals  = signals.filter(s => s.signal === 'BUY');
  const sellSignals = signals.filter(s => s.signal === 'SELL');

  // ── Executed trades rows ────────────────────────────────────────────────────
  const tradesRows = executedTrades.length > 0
    ? executedTrades.map(t => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-weight:600;color:${C.text};font-size:13px;">${t.symbol}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${C.border};">
          <span style="font-size:10px;font-weight:700;color:#16A34A;background:rgba(22,163,74,0.08);padding:2px 8px;border-radius:20px;">BUY</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:13px;color:${C.muted};">${fmt(t.size)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:13px;color:${C.muted};">${(t.confidence * 100).toFixed(0)}%</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:11px;color:${C.faint};background:#F8F8F6;">${t.strategy?.replace('_', ' ')}</td>
      </tr>`).join('')
    : `<tr><td colspan="5" style="padding:20px;text-align:center;color:${C.faint};font-size:13px;">No trades executed today</td></tr>`;

  // ── Top signals rows ────────────────────────────────────────────────────────
  const signalRows = buySignals.slice(0, 5).map(s => {
    const pct = Math.round(s.confidence * 100);
    return `
    <tr>
      <td style="padding:12px;border-bottom:1px solid ${C.border};vertical-align:top;">
        <div style="font-weight:600;color:${C.text};font-size:13px;">${s.symbol}</div>
        <div style="font-size:11px;color:${C.faint};margin-top:2px;">${s.strategy?.replace('_', ' ')}</div>
      </td>
      <td style="padding:12px;border-bottom:1px solid ${C.border};vertical-align:top;width:45%;">
        ${confBar(pct)}
        <div style="font-size:11px;color:${C.muted};margin-top:5px;">${s.reason}</div>
      </td>
    </tr>`;
  }).join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Artery Wealth Builder — Daily Report</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:'Helvetica Neue',Arial,sans-serif;color:${C.text};">

  <table role="presentation" style="width:100%;border-collapse:collapse;">
  <tr><td style="padding:32px 16px;">

    <table role="presentation" style="max-width:640px;margin:0 auto;border-collapse:collapse;">

      <!-- ── HEADER ──────────────────────────────────────────────────────── -->
      <tr>
        <td style="background:${C.white};border:1px solid ${C.border};border-radius:12px 12px 0 0;padding:28px 32px 20px;border-bottom:none;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            <tr>
              <td>${LOGO_SVG}</td>
              <td style="text-align:right;vertical-align:bottom;">
                <span style="background:${C.red};color:#fff;font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;padding:3px 9px;border-radius:20px;">LIVE</span>
              </td>
            </tr>
          </table>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid ${C.border};display:flex;justify-content:space-between;">
            <span style="font-size:12px;color:${C.faint};">Daily Report</span>
            <span style="font-size:12px;color:${C.faint};">${date}</span>
          </div>
        </td>
      </tr>

      <!-- ── METRIC CARDS ─────────────────────────────────────────────────── -->
      <tr>
        <td style="background:${C.white};border-left:1px solid ${C.border};border-right:1px solid ${C.border};padding:0 26px 24px;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            <tr>
              ${metricCard('Portfolio Value', fmt(totalValue))}
              ${metricCard('Total P&L', `${pnlSign(totalPnL)}${fmt(totalPnL)}`, `${pnlSign(totalPnLPct)}${totalPnLPct.toFixed(2)}%`, pnlClr(totalPnL))}
              ${metricCard('Cash Available', fmt(cashBalance))}
              ${metricCard('Goal Progress', `${progressPct}%`, `Target ${fmt(target)}`)}
            </tr>
          </table>
        </td>
      </tr>

      <!-- ── PROGRESS BAR ──────────────────────────────────────────────────── -->
      <tr>
        <td style="background:${C.white};border-left:1px solid ${C.border};border-right:1px solid ${C.border};padding:0 32px 28px;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="font-size:11px;color:${C.faint};">Progress to $1,000 profit goal</td>
              <td style="text-align:right;font-size:11px;color:${C.red};font-weight:500;">${progressPct}%</td>
            </tr>
          </table>
          <div style="background:#F0F0EE;border-radius:999px;height:6px;margin-top:6px;overflow:hidden;">
            <div style="width:${progressPct}%;height:6px;background:linear-gradient(90deg,${C.red},${C.redDark});border-radius:999px;"></div>
          </div>
          <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:5px;">
            <tr>
              <td style="font-size:10px;color:${C.faint};">${fmt(initialCapital)}</td>
              <td style="text-align:right;font-size:10px;color:${C.faint};">${fmt(target)}</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ── TODAY'S ACTIVITY ──────────────────────────────────────────────── -->
      <tr>
        <td style="background:${C.white};border:1px solid ${C.border};border-top:none;border-bottom:none;padding:0 32px 28px;">
          <div style="border-top:1px solid ${C.border};padding-top:24px;">
            ${sectionHead("Today's Trading Activity")}
            <table role="presentation" style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:12px 16px;background:#F8F8F6;border:1px solid ${C.border};border-radius:8px;text-align:center;">
                  <div style="font-size:22px;font-weight:700;color:${C.text};">${executedTrades.length}</div>
                  <div style="font-size:10px;color:${C.faint};margin-top:2px;text-transform:uppercase;letter-spacing:.6px;">Trades</div>
                </td>
                <td style="width:12px;"></td>
                <td style="padding:12px 16px;background:#F8F8F6;border:1px solid ${C.border};border-radius:8px;text-align:center;">
                  <div style="font-size:22px;font-weight:700;color:${C.text};">${closedPositions}</div>
                  <div style="font-size:10px;color:${C.faint};margin-top:2px;text-transform:uppercase;letter-spacing:.6px;">Closed</div>
                </td>
                <td style="width:12px;"></td>
                <td style="padding:12px 16px;background:#F8F8F6;border:1px solid ${C.border};border-radius:8px;text-align:center;">
                  <div style="font-size:22px;font-weight:700;color:${C.text};">${buySignals.length}</div>
                  <div style="font-size:10px;color:${C.faint};margin-top:2px;text-transform:uppercase;letter-spacing:.6px;">Buy Signals</div>
                </td>
                <td style="width:12px;"></td>
                <td style="padding:12px 16px;background:#F8F8F6;border:1px solid ${C.border};border-radius:8px;text-align:center;">
                  <div style="font-size:22px;font-weight:700;color:${C.text};">${sellSignals.length}</div>
                  <div style="font-size:10px;color:${C.faint};margin-top:2px;text-transform:uppercase;letter-spacing:.6px;">Sell Signals</div>
                </td>
              </tr>
            </table>
          </div>
        </td>
      </tr>

      <!-- ── EXECUTED TRADES TABLE ─────────────────────────────────────────── -->
      <tr>
        <td style="background:${C.white};border:1px solid ${C.border};border-top:none;border-bottom:none;padding:0 32px 28px;">
          <div style="border-top:1px solid ${C.border};padding-top:24px;">
            ${sectionHead('Executed Trades')}
            <table role="presentation" style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#F8F8F6;">
                  <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;color:${C.faint};letter-spacing:.6px;text-transform:uppercase;border-bottom:1px solid ${C.border};">Symbol</th>
                  <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;color:${C.faint};letter-spacing:.6px;text-transform:uppercase;border-bottom:1px solid ${C.border};">Side</th>
                  <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;color:${C.faint};letter-spacing:.6px;text-transform:uppercase;border-bottom:1px solid ${C.border};">Size</th>
                  <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;color:${C.faint};letter-spacing:.6px;text-transform:uppercase;border-bottom:1px solid ${C.border};">Confidence</th>
                  <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;color:${C.faint};letter-spacing:.6px;text-transform:uppercase;border-bottom:1px solid ${C.border};">Strategy</th>
                </tr>
              </thead>
              <tbody>${tradesRows}</tbody>
            </table>
          </div>
        </td>
      </tr>

      <!-- ── TOP BUY SIGNALS ───────────────────────────────────────────────── -->
      ${buySignals.length > 0 ? `
      <tr>
        <td style="background:${C.white};border:1px solid ${C.border};border-top:none;border-bottom:none;padding:0 32px 28px;">
          <div style="border-top:1px solid ${C.border};padding-top:24px;">
            ${sectionHead('Top Opportunities')}
            <table role="presentation" style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#F8F8F6;">
                  <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;color:${C.faint};letter-spacing:.6px;text-transform:uppercase;border-bottom:1px solid ${C.border};">Asset</th>
                  <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;color:${C.faint};letter-spacing:.6px;text-transform:uppercase;border-bottom:1px solid ${C.border};">Confidence &amp; Reason</th>
                </tr>
              </thead>
              <tbody>${signalRows}</tbody>
            </table>
          </div>
        </td>
      </tr>` : ''}

      <!-- ── CTA ──────────────────────────────────────────────────────────── -->
      <tr>
        <td style="background:${C.white};border:1px solid ${C.border};border-top:none;border-bottom:none;padding:0 32px 32px;">
          <div style="border-top:1px solid ${C.border};padding-top:24px;text-align:center;">
            <a href="https://arterycapital.co.za/trading"
               style="display:inline-block;padding:12px 32px;background:${C.red};color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;letter-spacing:.2px;">
              View Live Dashboard
            </a>
          </div>
        </td>
      </tr>

      <!-- ── FOOTER ────────────────────────────────────────────────────────── -->
      <tr>
        <td style="background:#F8F8F6;border:1px solid ${C.border};border-top:none;border-radius:0 0 12px 12px;padding:24px 32px;text-align:center;">
          <div style="font-size:12px;color:${C.faint};margin-bottom:4px;">
            <strong style="color:${C.muted};">Artery Capital</strong> · Wealth Builder
          </div>
          <div style="font-size:11px;color:#C0C0C0;">
            Automated report · <a href="mailto:invest@arterycapital.co.za" style="color:${C.red};text-decoration:none;">invest@arterycapital.co.za</a>
          </div>
          <div style="margin-top:12px;">
            <svg viewBox="0 0 300 50" xmlns="http://www.w3.org/2000/svg" width="120" height="40">
              <circle cx="25" cy="25" r="20" fill="none" stroke="#FF5A5F" stroke-width="1.5" opacity="0.2"/>
              <g transform="translate(10,8)">
                <path d="M 5 22 C 5 15, 8 9, 12 5 C 14 3, 16 3, 18 5 C 20 8, 21 11, 20 16 L 18 20 M 10 20 C 11 13, 14 10, 17 10 C 20 10, 23 13, 24 20 M 10 20 C 10 23, 11 25, 12 26 C 14 28, 18 28, 20 26 C 21 25, 22 23, 22 20"
                  stroke="#FF5A5F" stroke-width="2" fill="none" stroke-linecap="round"/>
              </g>
              <text x="55" y="30" font-family="'Helvetica Neue',Arial,sans-serif" font-size="16" font-weight="500" fill="#C0C0C0">Artery Capital</text>
            </svg>
          </div>
        </td>
      </tr>

    </table>
  </td></tr>
  </table>

</body>
</html>`;

  return sendEmail(
    ADMIN_EMAIL,
    `Wealth Builder Report — ${fmt(totalValue)} · ${pnlSign(totalPnLPct)}${totalPnLPct.toFixed(2)}%`,
    html
  );
}

async function sendTradeAlert({ symbol, side, size, price, reason, strategy }) {
  const isBuy = side.toUpperCase() === 'BUY';
  const sideColor = isBuy ? '#16A34A' : '#DC2626';
  const sideBg    = isBuy ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Trade Alert — ${symbol}</title></head>
<body style="margin:0;padding:0;background:#F8F8F6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
  <tr><td style="padding:32px 16px;">
    <table role="presentation" style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #EBEBEA;border-radius:12px;border-collapse:collapse;">
      <tr>
        <td style="padding:24px 28px;border-bottom:1px solid #EBEBEA;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            <tr>
              <td>
                <div style="font-size:11px;font-weight:600;color:#A0A0A0;letter-spacing:1px;text-transform:uppercase;">Artery Wealth Builder</div>
                <div style="font-size:18px;font-weight:700;color:#1A1A1A;margin-top:4px;">Trade Alert</div>
              </td>
              <td style="text-align:right;">
                <span style="background:${sideBg};color:${sideColor};font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;">${side.toUpperCase()}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 28px;">
          <div style="font-size:22px;font-weight:700;color:#1A1A1A;margin-bottom:16px;">${symbol}</div>
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            ${[['Strategy', strategy?.replace('_', ' ')], ['Size', fmt(size)], ['Price', fmt(price)], ['Reason', reason]].map(([k, v]) => `
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#A0A0A0;width:80px;">${k}</td>
              <td style="padding:8px 0;font-size:13px;color:#1A1A1A;font-weight:500;">${v}</td>
            </tr>`).join('')}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px 24px;text-align:center;">
          <a href="https://arterycapital.co.za/trading" style="display:inline-block;padding:10px 28px;background:#FF5A5F;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">View Dashboard</a>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px;background:#F8F8F6;border-top:1px solid #EBEBEA;border-radius:0 0 12px 12px;text-align:center;font-size:11px;color:#C0C0C0;">
          Artery Capital · <a href="mailto:invest@arterycapital.co.za" style="color:#FF5A5F;text-decoration:none;">invest@arterycapital.co.za</a>
        </td>
      </tr>
    </table>
  </td></tr>
  </table>
</body>
</html>`;

  return sendEmail(ADMIN_EMAIL, `Trade Alert: ${side.toUpperCase()} ${symbol} · ${fmt(size)}`, html);
}

module.exports = { sendDailyTradingReport, sendTradeAlert };
