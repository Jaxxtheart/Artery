import { Shield, TrendingDown, Activity } from 'lucide-react';

function Gauge({ label, value, max, color, format }) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor = color.includes('green') ? '#16A34A' : color.includes('red') ? '#DC2626' : color.includes('yellow') ? '#D97706' : '#FF5A5F';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
        <span style={{ color: '#8A8A8A' }}>{label}</span>
        <span style={{ color: barColor, fontWeight: 500 }}>{format ? format(value) : value}</span>
      </div>
      <div style={{ background: '#F5F5F4', borderRadius: 999, height: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, background: barColor, width: `${pct}%`, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

export default function RiskMetrics({ riskMetrics, snapshots = [] }) {
  const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);

  if (!riskMetrics) {
    return (
      <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24 }}>
        <div style={{ color: '#A0A0A0', fontSize: 13 }}>Loading risk metrics…</div>
      </div>
    );
  }

  const {
    positionCount = 0, maxAllowedPositions = 4,
    exposurePct = 0, totalPnL = 0, totalPnLPct = 0,
    stopLossPct = 3, takeProfitPct = 8, dailyLossLimit = 8,
  } = riskMetrics;

  const sortedSnapshots = [...snapshots].sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date));
  const weeklyPnL = sortedSnapshots.length >= 7
    ? sortedSnapshots[sortedSnapshots.length - 1].total_value - sortedSnapshots[sortedSnapshots.length - 7].total_value
    : null;

  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Shield size={14} color="#FF5A5F" />
        <h2 style={{ fontSize: 11, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', margin: 0 }}>
          Risk Dashboard
        </h2>
      </div>

      {/* Gauges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
        <Gauge
          label="Portfolio Exposure"
          value={exposurePct}
          max={100}
          color={exposurePct > 80 ? 'text-red-400' : exposurePct > 60 ? 'text-yellow-400' : 'text-green-400'}
          format={v => `${v?.toFixed(1)}%`}
        />
        <Gauge
          label="Positions Used"
          value={positionCount}
          max={maxAllowedPositions}
          color={positionCount >= maxAllowedPositions ? 'text-red-400' : 'text-indigo-400'}
          format={v => `${v} / ${maxAllowedPositions}`}
        />
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total P&L', main: `${totalPnL >= 0 ? '+' : ''}${fmt(totalPnL)}`, sub: `${totalPnLPct >= 0 ? '+' : ''}${totalPnLPct?.toFixed(2)}%`, mainColor: totalPnL >= 0 ? '#16A34A' : '#DC2626', subColor: totalPnL >= 0 ? '#16A34A' : '#DC2626' },
          { label: 'Weekly P&L', main: weeklyPnL === null ? '—' : `${weeklyPnL >= 0 ? '+' : ''}${fmt(weeklyPnL)}`, sub: '7-day change', mainColor: weeklyPnL === null ? '#A0A0A0' : weeklyPnL >= 0 ? '#16A34A' : '#DC2626', subColor: '#A0A0A0' },
          { label: 'Stop Loss', main: `${stopLossPct}%`, sub: 'Per position', mainColor: '#DC2626', subColor: '#A0A0A0' },
          { label: 'Take Profit', main: `${takeProfitPct}%`, sub: 'Target R:R 2.67', mainColor: '#16A34A', subColor: '#A0A0A0' },
        ].map(({ label, main, sub, mainColor, subColor }) => (
          <div key={label} style={{ background: '#FAFAF9', border: '1px solid #F0F0EE', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: '#A0A0A0', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: mainColor }}>{main}</div>
            <div style={{ fontSize: 10, color: subColor, marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Circuit breaker */}
      <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <TrendingDown size={13} color="#DC2626" style={{ marginTop: 1, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#DC2626' }}>Daily Loss Circuit Breaker</div>
          <div style={{ fontSize: 11, color: '#A0A0A0', marginTop: 2 }}>
            Auto-stops all trading if daily loss exceeds {dailyLossLimit}%
          </div>
        </div>
      </div>

      {/* Strategy list */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#C0C0C0' }}>
        <Activity size={10} />
        <span>Strategies: MOMENTUM · MEAN_REVERSION · BREAKOUT</span>
      </div>
    </div>
  );
}
