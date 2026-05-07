import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function OpenPositions({ positions = [], onClosePosition }) {
  const [closingId, setClosingId] = useState(null);
  const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
  const fmtPct = (v) => `${v >= 0 ? '+' : ''}${v?.toFixed(2)}%`;

  async function handleClose(positionId) {
    if (!confirm('Force close this position at market price?')) return;
    setClosingId(positionId);
    try { await onClosePosition(positionId); }
    finally { setClosingId(null); }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 11, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', margin: 0 }}>
          Open Positions
        </h2>
        <span style={{ background: 'rgba(255,90,95,0.08)', color: '#FF5A5F', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
          {positions.length} / 2
        </span>
      </div>

      {positions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#C0C0C0' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: 13, color: '#A0A0A0' }}>No open positions</div>
          <div style={{ fontSize: 11, color: '#C0C0C0', marginTop: 4 }}>The strategy will enter positions when signals align</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {positions.map((pos) => {
            const pnlUsd = pos.pnl_usd || 0;
            const pnlPct = pos.pnl_pct || 0;
            const isProfitable = pnlUsd >= 0;
            const nearStop = pos.stop_loss && pos.current_price && pos.current_price <= pos.stop_loss * 1.02;

            return (
              <div key={pos.id} style={{
                border: `1px solid ${nearStop ? '#FECACA' : '#EBEBEA'}`,
                background: nearStop ? '#FEF2F2' : '#FAFAF9',
                borderRadius: 10, padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{pos.symbol}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: pos.side === 'BUY' ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)', color: pos.side === 'BUY' ? '#16A34A' : '#DC2626' }}>
                        {pos.side}
                      </span>
                      <span style={{ fontSize: 10, color: '#A0A0A0', background: '#F5F5F4', padding: '2px 7px', borderRadius: 20 }}>
                        {pos.strategy}
                      </span>
                    </div>
                    {nearStop && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: '#DC2626', fontSize: 11 }}>
                        <AlertTriangle size={11} />
                        Near stop loss
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isProfitable ? '#16A34A' : '#DC2626' }}>
                        {pnlUsd >= 0 ? '+' : ''}{fmt(pnlUsd)}
                      </div>
                      <div style={{ fontSize: 11, color: isProfitable ? '#16A34A' : '#DC2626', opacity: 0.7 }}>
                        {fmtPct(pnlPct)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleClose(pos.id)}
                      disabled={closingId === pos.id}
                      style={{ color: '#C0C0C0', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, transition: 'color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
                      onMouseLeave={e => e.currentTarget.style.color = '#C0C0C0'}
                      title="Force close position"
                    >
                      {closingId === pos.id ? <span style={{ fontSize: 11, color: '#A0A0A0' }}>…</span> : <X size={15} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, fontSize: 11 }}>
                  {[
                    { label: 'Entry Price', value: fmt(pos.entry_price), color: '#4A4A4A' },
                    { label: 'Current Price', value: pos.current_price ? fmt(pos.current_price) : '—', color: '#4A4A4A' },
                    { label: 'Size', value: `${pos.size?.toFixed(6)} ${pos.symbol?.split('-')[0]}`, color: '#4A4A4A' },
                    { label: 'Stop Loss', value: pos.stop_loss ? fmt(pos.stop_loss) : '—', color: '#DC2626' },
                    { label: 'Take Profit', value: pos.take_profit ? fmt(pos.take_profit) : '—', color: '#16A34A' },
                    { label: 'Opened', value: pos.entry_time ? new Date(pos.entry_time).toLocaleDateString() : '—', color: '#6A6A6A' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div style={{ color: '#A0A0A0', marginBottom: 3 }}>{label}</div>
                      <div style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
