import { useState } from 'react';
import { TrendingDown, TrendingUp, Target, Clock, Pencil, Check, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';
const fmt    = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const fmtS   = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }).format(v);
const fmtPct = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

const MONTHLY_RETURN_RATE = 0.12;

function calcRecovery(totalUnrealisedLoss, cashAvailable) {
  if (totalUnrealisedLoss >= 0 || cashAvailable <= 0) return null;
  const loss = Math.abs(totalUnrealisedLoss);
  let capital = cashAvailable, months = 0, cumulative = 0;
  while (cumulative < loss && months < 120) {
    const gain = capital * MONTHLY_RETURN_RATE;
    cumulative += gain;
    capital += gain;
    months++;
  }
  return { months, projectedCapital: capital };
}

function PnlChip({ pct }) {
  if (pct === null) return <span style={{ color: '#C0C0C0', fontSize: 11 }}>—</span>;
  const pos = pct >= 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: pos ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', color: pos ? '#16A34A' : '#DC2626' }}>
      {pos ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
      {fmtPct(pct)}
    </span>
  );
}

function EditRow({ holding, adminPassword, onSaved }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    const spent = parseFloat(value);
    if (!spent || spent <= 0) { setErr('Enter a valid amount'); return; }
    setSaving(true);
    setErr('');
    try {
      const res = await fetch(`${API_BASE}/api/holdings/cost-basis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminPassword}` },
        body: JSON.stringify({ currency: holding.currency, total_spent: spent }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <td colSpan={5} style={{ padding: '8px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#6A6A6A' }}>Total USD spent on {holding.currency}:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#A0A0A0' }}>$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 750.00"
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
            style={{ width: 110, fontSize: 13, padding: '5px 8px', border: '1px solid #D0D0D0', borderRadius: 6, outline: 'none' }}
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '5px 12px', borderRadius: 6, background: '#1A1A1A', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          <Check size={11} /> {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => onSaved(false)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '5px 10px', borderRadius: 6, background: 'transparent', color: '#A0A0A0', border: '1px solid #E0E0DE', cursor: 'pointer' }}
        >
          <X size={11} /> Cancel
        </button>
        {err && <span style={{ fontSize: 11, color: '#DC2626' }}>{err}</span>}
      </div>
    </td>
  );
}

function RecoveryProjection({ totalUnrealisedLoss, cashAvailable }) {
  const result = calcRecovery(totalUnrealisedLoss, cashAvailable);
  return (
    <div style={{ marginTop: 24, borderTop: '1px solid #F0F0EE', paddingTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Clock size={13} color="#A0A0A0" />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Recovery Projection</span>
      </div>
      <div style={{ background: '#FFFBF0', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 11, color: '#92400E', lineHeight: 1.6 }}>
        Illustrative only — based on the bot deploying {fmt(cashAvailable)} cash at an assumed 12% monthly return (8% take-profit × ~1.5 winning trades/month). Actual results will vary.
      </div>
      {!result ? (
        <p style={{ fontSize: 13, color: '#A0A0A0' }}>
          {totalUnrealisedLoss === null
            ? 'Enter cost basis above to see your recovery projection.'
            : totalUnrealisedLoss >= 0
              ? 'Portfolio is in profit — no recovery needed.'
              : 'Add cash to the bot to model recovery.'}
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { label: 'Unrealised Loss', value: fmt(totalUnrealisedLoss), color: '#DC2626' },
            { label: 'Months to Offset', value: `~${result.months}m`, color: '#1A1A1A' },
            { label: 'Bot Capital Then', value: fmt(result.projectedCapital), color: '#16A34A' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#F8F8F6', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: '#A0A0A0', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HoldingsAnalysis({ holdings = [], summary = null, cashAvailable = 0, isLoading = false, onRefresh }) {
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [adminPassword, setAdminPassword] = useState(null);

  function startEdit(currency) {
    if (!adminPassword) {
      const pw = prompt('Enter admin password to save cost basis:');
      if (!pw) return;
      setAdminPassword(pw);
    }
    setEditingCurrency(currency);
  }

  function handleSaved(reload = true) {
    setEditingCurrency(null);
    if (reload && onRefresh) onRefresh();
  }

  if (isLoading) {
    return (
      <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24 }}>
        <div style={{ color: '#A0A0A0', fontSize: 13 }}>Loading holdings analysis…</div>
      </div>
    );
  }

  if (!holdings.length) return null;

  const sorted = [...holdings].sort((a, b) => (a.unrealisedPnlPct ?? 1) - (b.unrealisedPnlPct ?? 1));
  const missingCount = holdings.filter(h => h.costBasis === null).length;
  const totalUnrealisedLoss = summary?.totalUnrealisedPnl ?? null;

  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', margin: 0 }}>
            Holdings Analysis
          </h2>
          {summary?.totalCost != null ? (
            <p style={{ fontSize: 11, color: '#C0C0C0', margin: '4px 0 0' }}>
              Total invested {fmt(summary.totalCost)} · Current {fmt(summary.totalCurrentValue)}
            </p>
          ) : (
            <p style={{ fontSize: 11, color: '#C0C0C0', margin: '4px 0 0' }}>
              Current {fmt(summary?.totalCurrentValue ?? 0)}
            </p>
          )}
        </div>
        {totalUnrealisedLoss !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: totalUnrealisedLoss >= 0 ? '#16A34A' : '#DC2626' }}>
              {fmt(totalUnrealisedLoss)}
            </div>
            <div style={{ fontSize: 11, color: '#A0A0A0' }}>total unrealised P&L</div>
          </div>
        )}
      </div>

      {/* Prompt banner if cost basis is missing */}
      {missingCount > 0 && (
        <div style={{ background: '#F0F7FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#1D4ED8', lineHeight: 1.6 }}>
          <strong>{missingCount} coin{missingCount > 1 ? 's' : ''}</strong> need your cost basis to calculate break-even and P&L.
          Click the <Pencil size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> icon on each row and enter the <strong>total USD you spent</strong> buying that coin.
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F0F0EE' }}>
              {['Coin', 'Units', 'Cost Basis', 'Current', 'Unrealised P&L', 'Break-even', ''].map(h => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.6px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(h => {
              const isEditing = editingCurrency === h.currency;
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

                  {isEditing ? (
                    <EditRow holding={h} adminPassword={adminPassword} onSaved={handleSaved} />
                  ) : (
                    <>
                      <td style={{ padding: '10px 10px', color: '#6A6A6A' }}>
                        {h.balance < 0.001 ? h.balance.toFixed(6) : h.balance.toFixed(4)}
                      </td>
                      <td style={{ padding: '10px 10px', color: '#6A6A6A' }}>
                        {h.costBasis != null ? fmtS(h.costBasis) : <span style={{ color: '#C0C0C0' }}>N/A</span>}
                      </td>
                      <td style={{ padding: '10px 10px', color: '#1A1A1A', fontWeight: 500 }}>
                        {fmtS(h.currentPrice)}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        {h.unrealisedPnl != null ? (
                          <div>
                            <div style={{ color: h.unrealisedPnl >= 0 ? '#16A34A' : '#DC2626', fontWeight: 600 }}>{fmt(h.unrealisedPnl)}</div>
                            <PnlChip pct={h.unrealisedPnlPct} />
                          </div>
                        ) : <span style={{ color: '#C0C0C0', fontSize: 11 }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        {h.breakEvenPrice != null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Target size={11} color={h.breakEvenPrice > h.currentPrice ? '#DC2626' : '#16A34A'} />
                            <div>
                              <div style={{ color: h.breakEvenPrice > h.currentPrice ? '#DC2626' : '#16A34A', fontWeight: 600 }}>{fmtS(h.breakEvenPrice)}</div>
                              {h.breakEvenPrice > h.currentPrice && (
                                <div style={{ fontSize: 10, color: '#A0A0A0' }}>
                                  +{((h.breakEvenPrice / h.currentPrice - 1) * 100).toFixed(0)}% needed
                                </div>
                              )}
                            </div>
                          </div>
                        ) : <span style={{ color: '#C0C0C0', fontSize: 11 }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <button
                          onClick={() => startEdit(h.currency)}
                          title="Enter cost basis"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#A0A0A0', background: 'transparent', border: '1px solid #E0E0DE', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#1A1A1A'; e.currentTarget.style.borderColor = '#A0A0A0'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#A0A0A0'; e.currentTarget.style.borderColor = '#E0E0DE'; }}
                        >
                          <Pencil size={10} />
                          {h.costBasis != null ? 'Edit' : 'Add'}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <RecoveryProjection totalUnrealisedLoss={totalUnrealisedLoss} cashAvailable={cashAvailable} />
    </div>
  );
}
