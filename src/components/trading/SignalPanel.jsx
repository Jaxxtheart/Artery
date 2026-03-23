import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function SignalBadge({ signal }) {
  const config = {
    BUY:  { bg: 'rgba(22,163,74,0.08)',  color: '#16A34A', Icon: TrendingUp },
    SELL: { bg: 'rgba(220,38,38,0.08)',  color: '#DC2626', Icon: TrendingDown },
    HOLD: { bg: '#F5F5F4',               color: '#A0A0A0', Icon: Minus },
  };
  const { bg, color, Icon } = config[signal] || config.HOLD;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: bg, color }}>
      <Icon size={10} />
      {signal}
    </span>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#16A34A' : pct >= 65 ? '#D97706' : '#C0C0C0';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, background: '#F5F5F4', borderRadius: 999, height: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, background: color, width: `${pct}%`, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 10, color: '#A0A0A0', width: 28, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

export default function SignalPanel({ signals = [], onRefresh, onExecute, isRefreshing }) {
  const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v);
  const errorSignals = signals.filter(s => s.strategy === 'ERROR');
  const hasApiError = errorSignals.length > 0 && errorSignals.length === signals.length;
  const apiErrorMsg = hasApiError ? errorSignals[0]?.reason : null;
  const validSignals = hasApiError ? [] : signals;
  const actionable = validSignals.filter(s => s.signal !== 'HOLD');
  const holds = validSignals.filter(s => s.signal === 'HOLD');

  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', margin: 0 }}>
            Trading Signals
          </h2>
          <p style={{ fontSize: 11, color: '#C0C0C0', margin: '4px 0 0' }}>
            {actionable.length} actionable · {holds.length} monitoring
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{ color: '#C0C0C0', background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#2C2C2C'}
          onMouseLeave={e => e.currentTarget.style.color = '#C0C0C0'}
          title="Refresh signals"
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {hasApiError ? (
        <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>Coinbase API not connected</div>
          <div style={{ fontSize: 11, color: '#92400E', lineHeight: 1.5 }}>
            {apiErrorMsg?.includes('401')
              ? 'Invalid API credentials. Add COINBASE_API_KEY and COINBASE_API_SECRET to your Vercel environment variables.'
              : apiErrorMsg}
          </div>
        </div>
      ) : validSignals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#C0C0C0', fontSize: 13 }}>
          Click refresh to generate signals
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {validSignals.map((signal, idx) => (
            <div key={`${signal.symbol}-${signal.strategy}-${idx}`} style={{
              border: `1px solid ${signal.signal === 'BUY' ? 'rgba(22,163,74,0.15)' : signal.signal === 'SELL' ? 'rgba(220,38,38,0.15)' : '#EBEBEA'}`,
              background: signal.signal === 'BUY' ? 'rgba(22,163,74,0.03)' : signal.signal === 'SELL' ? 'rgba(220,38,38,0.03)' : '#FAFAF9',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{signal.symbol}</span>
                  <SignalBadge signal={signal.signal} />
                  <span style={{ fontSize: 10, color: '#A0A0A0', background: '#F5F5F4', padding: '2px 6px', borderRadius: 4 }}>
                    {signal.strategy?.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#4A4A4A' }}>{signal.price > 0 ? fmt(signal.price) : '—'}</div>
              </div>

              <ConfidenceBar value={signal.confidence} />

              <div style={{ fontSize: 11, color: '#8A8A8A', marginTop: 6, lineHeight: 1.5 }}>{signal.reason}</div>

              {signal.signal === 'BUY' && signal.confidence >= 0.60 && onExecute && (
                <button
                  onClick={() => onExecute(signal)}
                  style={{
                    marginTop: 10, width: '100%', fontSize: 12, fontWeight: 500, padding: '7px 0',
                    borderRadius: 6, background: 'rgba(22,163,74,0.06)', color: '#16A34A',
                    border: '1px solid rgba(22,163,74,0.2)', cursor: 'pointer', transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(22,163,74,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(22,163,74,0.06)'}
                >
                  Execute Trade
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
