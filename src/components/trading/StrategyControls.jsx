import { useState } from 'react';
import { Play, Pause, Zap, Mail, Shield } from 'lucide-react';

export default function StrategyControls({ onRunCron, onSendReport, riskMetrics }) {
  const [tradingEnabled, setTradingEnabled] = useState(true);
  const [running, setRunning] = useState(null);
  const [lastRun, setLastRun] = useState(null);
  const apiBase = import.meta.env.VITE_API_URL || '';

  async function handleRunCron() {
    if (!confirm('Run automated trading cycle now?')) return;
    setRunning('cron');
    try {
      const res = await fetch(`${apiBase}/api/cron/daily-trade`, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_CRON_SECRET || ''}` }
      });
      const data = await res.json();
      setLastRun(data);
      if (onRunCron) onRunCron(data);
      alert(`Trading cycle complete: ${data.tradesExecuted || 0} trades executed`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setRunning(null);
    }
  }

  async function handleSendReport() {
    setRunning('email');
    try {
      const res = await fetch(`${apiBase}/api/email/daily-report`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${import.meta.env.VITE_CRON_SECRET || ''}` }
      });
      const data = await res.json();
      if (data.success) alert('Daily report sent to jaxxtheart@gmail.com');
      else alert(`Error: ${data.error}`);
      if (onSendReport) onSendReport(data);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 11, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', margin: 0 }}>
        Strategy Controls
      </h2>

      {/* Trading toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAF9', border: '1px solid #F0F0EE', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: tradingEnabled ? '#16A34A' : '#C0C0C0', animation: tradingEnabled ? 'pulse 2s infinite' : 'none' }} />
          <span style={{ fontSize: 13, color: '#2C2C2C' }}>Auto Trading</span>
        </div>
        <button
          onClick={() => setTradingEnabled(!tradingEnabled)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
            padding: '5px 12px', borderRadius: 6, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
            background: tradingEnabled ? 'rgba(22,163,74,0.08)' : '#F5F5F4',
            color: tradingEnabled ? '#16A34A' : '#A0A0A0',
          }}
        >
          {tradingEnabled ? <><Pause size={11} /> Active</> : <><Play size={11} /> Paused</>}
        </button>
      </div>

      {/* Risk metrics */}
      {riskMetrics && (
        <div style={{ background: '#FAFAF9', border: '1px solid #F0F0EE', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
            <Shield size={11} />
            Risk Status
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 11 }}>
            {[
              { label: 'Positions', value: `${riskMetrics.positionCount} / ${riskMetrics.maxAllowedPositions}`, color: '#4A4A4A' },
              { label: 'Exposure', value: `${riskMetrics.exposurePct?.toFixed(1)}%`, color: '#4A4A4A' },
              { label: 'Stop Loss', value: `${riskMetrics.stopLossPct}%`, color: '#DC2626' },
              { label: 'Take Profit', value: `${riskMetrics.takeProfitPct}%`, color: '#16A34A' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ color: '#A0A0A0', marginBottom: 3 }}>{label}</div>
                <div style={{ color, fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={handleRunCron}
          disabled={running === 'cron'}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: 'rgba(255,90,95,0.06)', color: '#FF5A5F', border: '1px solid rgba(255,90,95,0.2)',
            fontSize: 13, fontWeight: 500, padding: '10px 0', borderRadius: 6, cursor: 'pointer', transition: 'background 0.2s',
            opacity: running === 'cron' ? 0.5 : 1,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,90,95,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,90,95,0.06)'}
        >
          <Zap size={14} />
          {running === 'cron' ? 'Running…' : 'Run Trading Cycle'}
        </button>

        <button
          onClick={handleSendReport}
          disabled={running === 'email'}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: '#FAFAF9', color: '#6A6A6A', border: '1px solid #EBEBEA',
            fontSize: 13, fontWeight: 500, padding: '10px 0', borderRadius: 6, cursor: 'pointer', transition: 'background 0.2s',
            opacity: running === 'email' ? 0.5 : 1,
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#F5F5F4'}
          onMouseLeave={e => e.currentTarget.style.background = '#FAFAF9'}
        >
          <Mail size={14} />
          {running === 'email' ? 'Sending…' : 'Send Daily Report'}
        </button>
      </div>

      {/* Schedule info */}
      <div style={{ fontSize: 11, color: '#A0A0A0', borderTop: '1px solid #F0F0EE', paddingTop: 14 }}>
        {[
          { label: 'Daily execution', value: '10:00 PM UTC' },
          { label: 'Monitored assets', value: 'BTC ETH SOL AVAX MATIC' },
          { label: 'Daily loss limit', value: '8%', valueColor: '#DC2626' },
        ].map(({ label, value, valueColor }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>{label}</span>
            <span style={{ color: valueColor || '#8A8A8A' }}>{value}</span>
          </div>
        ))}
      </div>

      {lastRun && (
        <div style={{ fontSize: 11, color: '#8A8A8A', background: '#FAFAF9', border: '1px solid #F0F0EE', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontWeight: 600, color: '#4A4A4A', marginBottom: 6 }}>Last Run Result</div>
          <div>Signals: {lastRun.signalsAnalyzed}</div>
          <div>Trades: {lastRun.tradesExecuted}</div>
          <div>Closed: {lastRun.positionsClosed}</div>
        </div>
      )}
    </div>
  );
}
