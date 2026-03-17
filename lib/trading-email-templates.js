/**
 * Trading Email Templates
 * HTML email reports for daily trading summary
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
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Artery Capital Trading <trading@arterycapital.com>',
      to: [to],
      subject,
      html
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend API error: ${err}`);
  }

  return response.json();
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function pnlColor(value) {
  return value >= 0 ? '#00d084' : '#ff4444';
}

function pnlSign(value) {
  return value >= 0 ? '+' : '';
}

async function sendDailyTradingReport({ portfolio, signals, executedTrades, closedPositions, log }) {
  const { totalValue, cashBalance } = portfolio;
  const initialCapital = parseFloat(process.env.INITIAL_CAPITAL || '1441');
  const totalPnL = totalValue - initialCapital;
  const totalPnLPct = (totalPnL / initialCapital) * 100;
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const buySignals = signals.filter(s => s.signal === 'BUY');
  const sellSignals = signals.filter(s => s.signal === 'SELL');

  const tradesHtml = executedTrades.length > 0
    ? executedTrades.map(t => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #333;">${t.symbol}</td>
        <td style="padding:8px;border-bottom:1px solid #333;color:#00d084;">BUY</td>
        <td style="padding:8px;border-bottom:1px solid #333;">${formatCurrency(t.size)}</td>
        <td style="padding:8px;border-bottom:1px solid #333;">${(t.confidence * 100).toFixed(0)}%</td>
        <td style="padding:8px;border-bottom:1px solid #333;">${t.strategy}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="padding:12px;text-align:center;color:#888;">No trades executed today</td></tr>';

  const signalsHtml = buySignals.slice(0, 5).map(s => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #222;">${s.symbol}</td>
      <td style="padding:8px;border-bottom:1px solid #222;color:#00d084;">${s.signal}</td>
      <td style="padding:8px;border-bottom:1px solid #222;">${(s.confidence * 100).toFixed(0)}%</td>
      <td style="padding:8px;border-bottom:1px solid #222;">${s.strategy}</td>
      <td style="padding:8px;border-bottom:1px solid #222;font-size:12px;color:#aaa;">${s.reason}</td>
    </tr>`).join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Artery Capital - Daily Trading Report</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;color:#fff;">
  <div style="max-width:650px;margin:0 auto;padding:24px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid #333;border-radius:12px;padding:32px;margin-bottom:24px;text-align:center;">
      <div style="font-size:28px;font-weight:800;letter-spacing:-1px;margin-bottom:4px;">
        <span style="color:#fff;">ARTERY</span><span style="color:#6366f1;"> CAPITAL</span>
      </div>
      <div style="color:#888;font-size:14px;">Artery Wealth Builder Daily Report</div>
      <div style="color:#555;font-size:12px;margin-top:4px;">${date}</div>
    </div>

    <!-- Portfolio Summary -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px;">
      <div style="background:#111;border:1px solid #222;border-radius:8px;padding:20px;text-align:center;">
        <div style="color:#888;font-size:11px;letter-spacing:1px;margin-bottom:8px;">PORTFOLIO VALUE</div>
        <div style="font-size:24px;font-weight:700;">${formatCurrency(totalValue)}</div>
      </div>
      <div style="background:#111;border:1px solid #222;border-radius:8px;padding:20px;text-align:center;">
        <div style="color:#888;font-size:11px;letter-spacing:1px;margin-bottom:8px;">TOTAL P&L</div>
        <div style="font-size:24px;font-weight:700;color:${pnlColor(totalPnL)};">
          ${pnlSign(totalPnL)}${formatCurrency(totalPnL)}
        </div>
        <div style="font-size:13px;color:${pnlColor(totalPnLPct)};">${pnlSign(totalPnLPct)}${totalPnLPct.toFixed(2)}%</div>
      </div>
      <div style="background:#111;border:1px solid #222;border-radius:8px;padding:20px;text-align:center;">
        <div style="color:#888;font-size:11px;letter-spacing:1px;margin-bottom:8px;">CASH AVAILABLE</div>
        <div style="font-size:24px;font-weight:700;">${formatCurrency(cashBalance)}</div>
      </div>
    </div>

    <!-- Today's Activity -->
    <div style="background:#111;border:1px solid #222;border-radius:8px;padding:24px;margin-bottom:24px;">
      <h3 style="margin:0 0 16px;font-size:14px;letter-spacing:1px;color:#888;">TODAY'S TRADING ACTIVITY</h3>
      <div style="display:flex;gap:24px;margin-bottom:16px;">
        <div style="color:#aaa;font-size:14px;">
          <span style="color:#00d084;font-weight:700;">${executedTrades.length}</span> trades executed
        </div>
        <div style="color:#aaa;font-size:14px;">
          <span style="color:#f59e0b;font-weight:700;">${closedPositions}</span> positions closed
        </div>
        <div style="color:#aaa;font-size:14px;">
          <span style="color:#6366f1;font-weight:700;">${buySignals.length}</span> buy signals
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="color:#555;font-size:11px;letter-spacing:1px;">
            <th style="padding:8px;text-align:left;">SYMBOL</th>
            <th style="padding:8px;text-align:left;">SIDE</th>
            <th style="padding:8px;text-align:left;">SIZE</th>
            <th style="padding:8px;text-align:left;">CONFIDENCE</th>
            <th style="padding:8px;text-align:left;">STRATEGY</th>
          </tr>
        </thead>
        <tbody>${tradesHtml}</tbody>
      </table>
    </div>

    <!-- Top Signals -->
    ${buySignals.length > 0 ? `
    <div style="background:#111;border:1px solid #222;border-radius:8px;padding:24px;margin-bottom:24px;">
      <h3 style="margin:0 0 16px;font-size:14px;letter-spacing:1px;color:#888;">TOP OPPORTUNITIES TOMORROW</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="color:#555;font-size:11px;letter-spacing:1px;">
            <th style="padding:8px;text-align:left;">SYMBOL</th>
            <th style="padding:8px;text-align:left;">SIGNAL</th>
            <th style="padding:8px;text-align:left;">CONFIDENCE</th>
            <th style="padding:8px;text-align:left;">STRATEGY</th>
            <th style="padding:8px;text-align:left;">REASON</th>
          </tr>
        </thead>
        <tbody>${signalsHtml}</tbody>
      </table>
    </div>` : ''}

    <!-- Progress to Goal -->
    <div style="background:#111;border:1px solid #222;border-radius:8px;padding:24px;margin-bottom:24px;">
      <h3 style="margin:0 0 12px;font-size:14px;letter-spacing:1px;color:#888;">PROGRESS TO GOAL</h3>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;">
        <span style="color:#aaa;">Target: $2,441 (+$1,000 profit)</span>
        <span style="color:#6366f1;">${((totalValue / 2441) * 100).toFixed(1)}% of goal</span>
      </div>
      <div style="background:#1a1a1a;border-radius:4px;height:8px;overflow:hidden;">
        <div style="background:linear-gradient(90deg,#6366f1,#8b5cf6);height:100%;width:${Math.min((totalValue / 2441) * 100, 100).toFixed(1)}%;border-radius:4px;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:#555;">
        <span>${formatCurrency(initialCapital)}</span>
        <span>${formatCurrency(2441)}</span>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:#444;font-size:12px;padding-top:16px;">
      <div>Artery Capital Artery Wealth Builder System</div>
      <div style="margin-top:4px;">Automated report — Do not reply to this email</div>
    </div>
  </div>
</body>
</html>`;

  return sendEmail(
    ADMIN_EMAIL,
    `Artery Wealth Builder — ${formatCurrency(totalValue)} | ${pnlSign(totalPnLPct)}${totalPnLPct.toFixed(2)}%`,
    html
  );
}

async function sendTradeAlert({ symbol, side, size, price, reason, strategy }) {
  const html = `
<!DOCTYPE html>
<html>
<body style="background:#0a0a0a;color:#fff;font-family:Arial,sans-serif;padding:24px;">
  <div style="max-width:500px;margin:0 auto;background:#111;border:1px solid #333;border-radius:8px;padding:24px;">
    <h2 style="color:${side === 'BUY' ? '#00d084' : '#ff4444'};margin:0 0 16px;">${side} Alert: ${symbol}</h2>
    <p><strong>Strategy:</strong> ${strategy}</p>
    <p><strong>Size:</strong> ${formatCurrency(size)}</p>
    <p><strong>Price:</strong> ${formatCurrency(price)}</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p style="color:#555;font-size:12px;margin-top:16px;">${new Date().toISOString()}</p>
  </div>
</body>
</html>`;

  return sendEmail(ADMIN_EMAIL, `🔔 Trade Alert: ${side} ${symbol}`, html);
}

module.exports = { sendDailyTradingReport, sendTradeAlert };
