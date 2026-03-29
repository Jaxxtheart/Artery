import { TrendingDown, TrendingUp, Target, Clock } from 'lucide-react';

const fmt  = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const fmtS = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }).format(v);
const fmtPct = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

// ── Recovery projection ───────────────────────────────────────────────────────
// Conservative assumptions (clearly labelled as illustrative):
//   - Bot deploys available cash using its signal strategy
//   - Take-profit target per trade: 8%  (configured in risk-manager)
//   - Estimated trades that hit target per month: 1.5  (conservative)
//   - Monthly return on deployed capital ≈ 12%
const MONTHLY_RETURN_RATE = 0.12;

function calcRecovery(totalUnrealisedLoss, cashAvailable) {
  if (totalUnrealisedLoss >= 0 || cashAvailable <= 0) return null;
  const loss = Math.abs(totalUnrealisedLoss);
  let capital = cashAvailable;
  let months = 0;
  let cumulative = 0;
  while (cumulative < loss && months < 120) {
    const gain = capital * MONTHLY_RETURN_RATE;
    cumulative += gain;
    capital += gain;
    months++;
  }
  return { months, projectedCapital: capital };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PnlChip({ pct }) {
  if (pct === null) return <span style={{ color: '#C0C0C0', fontSize: 11 }}>N/A</span>;
  const positive = pct >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
      background: positive ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
      color: positive ? '#16A34A' : '#DC2626',
    }}>
      {positive ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
      {fmtPct(pct)}
    </span>
  );
}

function RecoveryProjection({ totalUnrealisedLoss, cashAvailable }) {
  const result = calcRecovery(totalUnrealisedLoss, cashAvailable);

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid #F0F0EE', paddingTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Clock size={13} color="#A0A0A0" />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          Recovery Projection
        </span>
      </div>

      <div style={{ background: '#FFFBF0', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 11, color: '#92400E', lineHeight: 1.6 }}>
        Illustrative only — based on the bot deploying {fmt(cashAvailable)} cash at an assumed 12% monthly return
        (8% take-profit × ~1.5 winning trades/month). Actual results will vary.
      </div>

      {!result ? (
        <p style={{ fontSize: 13, color: '#A0A0A0' }}>
          {totalUnrealisedLoss >= 0 ? 'Portfolio is in profit — no recovery needed.' : 'Add cash to the bot to model recovery.'}
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ background: '#F8F8F6', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#A0A0A0', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Unrealised Loss</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#DC2626' }}>{fmt(totalUnrealisedLoss)}</div>
          </div>
          <div style={{ background: '#F8F8F6', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#A0A0A0', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Months to Offset</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>~{result.months}m</div>
          </div>
          <div style={{ background: '#F8F8F6', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#A0A0A0', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Bot Capital Then</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#16A34A' }}>{fmt(result.projectedCapital)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HoldingsAnalysis({ holdings = [], summary = null, cashAvailable = 0, isLoading = false }) {
  if (isLoading) {
    return (
      <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24 }}>
        <div style={{ color: '#A0A0A0', fontSize: 13 }}>Loading holdings analysis…</div>
      </div>
    );
  }

  if (!holdings.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24 }}>
        <div style={{ color: '#C0C0C0', fontSize: 13 }}>No holdings data available.</div>
      </div>
    );
  }

  const sorted = [...holdings].sort((a, b) => (a.unrealisedPnlPct ?? 0) - (b.unrealisedPnlPct ?? 0));
  const totalUnrealisedLoss = summary?.totalUnrealisedPnl ?? 0;

  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', margin: 0 }}>
            Holdings Analysis
          </h2>
          {summary && (
            <p style={{ fontSize: 11, color: '#C0C0C0', margin: '4px 0 0' }}>
              Total invested {fmt(summary.totalCost)} · Current {fmt(summary.totalCurrentValue)}
            </p>
          )}
        </div>
        {summary && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: totalUnrealisedLoss >= 0 ? '#16A34A' : '#DC2626' }}>
              {fmt(totalUnrealisedLoss)}
            </div>
            <div style={{ fontSize: 11, color: '#A0A0A0' }}>total unrealised P&L</div>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F0F0EE' }}>
              {['Coin', 'Units', 'Cost Basis', 'Current', 'Unrealised P&L', 'Break-even'].map(h => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.6px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(h => {
              const hasData = h.costBasis !== null;
              return (
                <tr key={h.currency} style={{ borderBottom: '1px solid #F8F8F6' }}>
                  <td style={{ padding: '10px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,90,95,0.08)', border: '1px solid rgba(255,90,95,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#FF5A5F', flexShrink: 0 }}>
                        {h.currency.slice(0, 2)}
                      </div>
                      <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{h.currency}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 10px', color: '#6A6A6A' }}>
                    {h.balance < 0.001 ? h.balance.toFixed(6) : h.balance.toFixed(4)}
                  </td>
                  <td style={{ padding: '10px 10px', color: '#6A6A6A' }}>
                    {hasData ? fmtS(h.costBasis) : <span style={{ color: '#C0C0C0' }}>N/A</span>}
                  </td>
                  <td style={{ padding: '10px 10px', color: '#1A1A1A', fontWeight: 500 }}>
                    {fmtS(h.currentPrice)}
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    {hasData ? (
                      <div>
                        <div style={{ color: h.unrealisedPnl >= 0 ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                          {fmt(h.unrealisedPnl)}
                        </div>
                        <PnlChip pct={h.unrealisedPnlPct} />
                      </div>
                    ) : <span style={{ color: '#C0C0C0', fontSize: 11 }}>N/A</span>}
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    {hasData ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Target size={11} color={h.breakEvenPrice > h.currentPrice ? '#DC2626' : '#16A34A'} />
                        <span style={{ color: h.breakEvenPrice > h.currentPrice ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                          {fmtS(h.breakEvenPrice)}
                        </span>
                        {h.breakEvenPrice > h.currentPrice && (
                          <span style={{ fontSize: 10, color: '#A0A0A0' }}>
                            ({((h.breakEvenPrice / h.currentPrice - 1) * 100).toFixed(0)}% needed)
                          </span>
                        )}
                      </div>
                    ) : <span style={{ color: '#C0C0C0', fontSize: 11 }}>N/A</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recovery projection */}
      <RecoveryProjection totalUnrealisedLoss={totalUnrealisedLoss} cashAvailable={cashAvailable} />
    </div>
  );
}
