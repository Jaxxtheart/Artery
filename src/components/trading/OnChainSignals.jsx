/**
 * OnChainSignals — displays active on-chain signals from the Python signal engine
 * and backtesting accuracy stats from historical signal executions.
 *
 * Data source: GET /api/trading/onchain-signals
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Activity, Clock, Target, BarChart2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDecay(expiresAt) {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt) - Date.now();
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function signalTypeLabel(type) {
  const map = {
    whale_accumulation: 'Whale',
    vol_spike: 'Vol Spike',
    stablecoin_flow: 'Stable Flow',
    liquidation_cascade: 'Liquidation',
  };
  return map[type] || type?.replace(/_/g, ' ') || '—';
}

function signalTypeColor(type) {
  const map = {
    whale_accumulation: { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
    vol_spike:          { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
    stablecoin_flow:    { bg: '#F0FDF4', text: '#166534', dot: '#22C55E' },
    liquidation_cascade:{ bg: '#FDF4FF', text: '#7E22CE', dot: '#A855F7' },
  };
  return map[type] || { bg: '#F5F5F4', text: '#6A6A6A', dot: '#A0A0A0' };
}

function DirectionIcon({ direction }) {
  if (direction === 'BULLISH') return <TrendingUp size={13} color="#16A34A" />;
  if (direction === 'BEARISH') return <TrendingDown size={13} color="#DC2626" />;
  return <Minus size={13} color="#A0A0A0" />;
}

function ConfBar({ value, boosted }) {
  const pct = Math.round((value || 0) * 100);
  const bPct = boosted ? Math.round(boosted * 100) : null;
  const color = pct >= 80 ? '#16A34A' : pct >= 60 ? '#F59E0B' : '#A0A0A0';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#F0F0EE', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
        {bPct && bPct > pct && (
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${bPct}%`, background: color, opacity: 0.3, borderRadius: 4 }} />
        )}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 32, textAlign: 'right' }}>
        {pct}%
      </span>
      {bPct && bPct > pct && (
        <span style={{ fontSize: 10, color: '#16A34A', fontWeight: 600 }}>→{bPct}%</span>
      )}
    </div>
  );
}

// ─── Signal card ──────────────────────────────────────────────────────────────

function SignalCard({ sig }) {
  const [expanded, setExpanded] = useState(false);
  const colors = signalTypeColor(sig.signal_type);
  const confs = sig.signal_strategy_confirmations || [];
  const metConfs = confs.filter(c => c.strategy_condition_met);
  const maxBoosted = Math.max(...confs.map(c => c.signal_boosted_confidence || 0), sig.confidence_score || 0);
  const autoExecute = maxBoosted >= 0.80 && metConfs.length > 0;
  const decayStr = formatDecay(sig.expires_at);
  const dirColor = sig.direction === 'BULLISH' ? '#16A34A' : sig.direction === 'BEARISH' ? '#DC2626' : '#A0A0A0';

  return (
    <div style={{
      border: '1px solid #EBEBEA', borderRadius: 10,
      overflow: 'hidden',
      boxShadow: autoExecute ? '0 0 0 1.5px #16A34A22' : 'none',
    }}>
      {/* Card header */}
      <div
        style={{ padding: '12px 14px', cursor: 'pointer', background: '#fff', userSelect: 'none' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {/* Type badge */}
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', padding: '2px 7px',
            borderRadius: 12, background: colors.bg, color: colors.text,
          }}>
            {signalTypeLabel(sig.signal_type)}
          </span>

          {/* Asset */}
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{sig.asset}</span>

          {/* Direction */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: dirColor, marginLeft: 'auto' }}>
            <DirectionIcon direction={sig.direction} />
            {sig.direction}
          </span>
        </div>

        {/* Confidence bar */}
        <ConfBar value={sig.confidence_score} boosted={maxBoosted > sig.confidence_score ? maxBoosted : null} />

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 7, fontSize: 10, color: '#A0A0A0' }}>
          {/* Strategy confirmations count */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Target size={10} />
            {metConfs.length}/{confs.length} strategies confirmed
          </span>
          {/* Decay */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={10} />
            {decayStr} left
          </span>
          {/* Auto-execute badge */}
          {autoExecute && (
            <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '2px 6px', letterSpacing: '0.4px' }}>
              AUTO-EXECUTE ≥80%
            </span>
          )}
        </div>
      </div>

      {/* Expanded: strategy confirmations */}
      {expanded && confs.length > 0 && (
        <div style={{ borderTop: '1px solid #F5F5F4', background: '#FAFAF9', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {confs.map(c => {
            const met = c.strategy_condition_met;
            const stratLabel = (c.strategy_name || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const boost = c.boost_amount ? `+${Math.round(c.boost_amount * 100)}%` : '';
            const bConf = c.signal_boosted_confidence;
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                <span style={{ fontWeight: 700, color: met ? '#16A34A' : '#D0D0CE', width: 12 }}>{met ? '✓' : '✗'}</span>
                <span style={{ color: met ? '#1A1A1A' : '#B0B0B0', flex: 1 }}>{stratLabel}</span>
                {met && boost && (
                  <span style={{ color: '#16A34A', fontWeight: 600, fontSize: 10 }}>
                    {Math.round((c.strategy_confidence || 0) * 100)}% → {Math.round((bConf || 0) * 100)}% ({boost})
                  </span>
                )}
                {bConf >= 0.80 && met && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '1px 5px' }}>
                    EXECUTE
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Backtesting table ────────────────────────────────────────────────────────

function BacktestTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ color: '#C0C0C0', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
        No closed signal executions yet — backtesting data will appear once the engine has run trades.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ color: '#A0A0A0', borderBottom: '1px solid #EBEBEA' }}>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Strategy</th>
            <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Trades</th>
            <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Win Rate</th>
            <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Avg Win</th>
            <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Avg Loss</th>
            <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Net P&L%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const wrColor = r.winRate >= 60 ? '#16A34A' : r.winRate >= 45 ? '#F59E0B' : '#DC2626';
            const pnlColor = r.totalPnlPct >= 0 ? '#16A34A' : '#DC2626';
            return (
              <tr key={r.strategy} style={{ borderBottom: '1px solid #F5F5F4' }}>
                <td style={{ padding: '8px 8px', color: '#2C2C2C', fontWeight: 500 }}>
                  {r.strategy.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right', color: '#6A6A6A' }}>{r.trades}</td>
                <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, color: wrColor }}>{r.winRate}%</td>
                <td style={{ padding: '8px 8px', textAlign: 'right', color: '#16A34A' }}>+{r.avgWin}%</td>
                <td style={{ padding: '8px 8px', textAlign: 'right', color: '#DC2626' }}>-{r.avgLoss}%</td>
                <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, color: pnlColor }}>
                  {r.totalPnlPct >= 0 ? '+' : ''}{r.totalPnlPct}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Summary pills ────────────────────────────────────────────────────────────

function Pill({ label, value, color = '#6A6A6A' }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 16px', background: '#FAFAF9', borderRadius: 8, border: '1px solid #F0F0EE' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#A0A0A0', marginTop: 2, letterSpacing: '0.3px' }}>{label}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnChainSignals() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('signals'); // 'signals' | 'backtest'

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/trading/onchain-signals`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  const signals = data?.signals || [];
  const backtesting = data?.backtesting || [];

  // Group signals by asset for easier scanning
  const bullish = signals.filter(s => s.direction === 'BULLISH');
  const bearish = signals.filter(s => s.direction === 'BEARISH');
  const neutral = signals.filter(s => s.direction !== 'BULLISH' && s.direction !== 'BEARISH');

  // Summary counts
  const autoExecCount = signals.filter(s => {
    const confs = s.signal_strategy_confirmations || [];
    const maxB = Math.max(...confs.map(c => c.signal_boosted_confidence || 0), 0);
    return maxB >= 0.80 && confs.some(c => c.strategy_condition_met);
  }).length;

  const tab = (id, label, icon) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 600, padding: '5px 12px',
        borderRadius: 6, border: 'none', cursor: 'pointer',
        background: activeTab === id ? '#2C2C2C' : 'transparent',
        color: activeTab === id ? '#fff' : '#8A8A8A',
        transition: 'all 0.2s',
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div style={{
      background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12,
      padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', margin: 0 }}>
              On-Chain Signal Engine
            </h2>
            {data && (
              <span style={{ fontSize: 9, fontWeight: 700, background: '#FF5A5F', color: '#fff', borderRadius: 20, padding: '2px 6px', letterSpacing: '0.5px' }}>
                LIVE
              </span>
            )}
          </div>
          {data?.fetchedAt && (
            <div style={{ fontSize: 10, color: '#C0C0C0', marginTop: 3 }}>
              Python engine · updated {new Date(data.fetchedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: '#8A8A8A', background: 'transparent',
            border: '1px solid #E0E0DE', borderRadius: 6,
            padding: '5px 10px', cursor: 'pointer',
          }}
        >
          <RefreshCw size={11} style={loading ? { animation: 'spin 0.8s linear infinite' } : {}} />
          Refresh
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#F5F5F4', borderRadius: 8, padding: 4 }}>
        {tab('signals', 'Active Signals', <Activity size={11} />)}
        {tab('backtest', 'Backtesting', <BarChart2 size={11} />)}
      </div>

      {/* ── Loading ── */}
      {loading && !data && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 10, color: '#A0A0A0', fontSize: 12 }}>
          <div style={{ width: 16, height: 16, border: '2px solid #EBEBEA', borderTopColor: '#FF5A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Loading on-chain signals…
        </div>
      )}

      {/* ── Error state ── */}
      {error && !loading && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#DC2626' }}>
          <strong>Could not load on-chain signals:</strong> {error}
          <div style={{ marginTop: 6, color: '#A0A0A0', fontSize: 11 }}>
            Ensure the Python signal engine has run at least once (05:00 UTC) and the Supabase onchain_signals table has been created.
          </div>
        </div>
      )}

      {/* ── No engine message ── */}
      {data?.message && !loading && (
        <div style={{ background: '#F5F5F4', border: '1px solid #E8E8E6', borderRadius: 8, padding: '14px', fontSize: 12, color: '#8A8A8A', textAlign: 'center' }}>
          <Activity size={24} color="#D0D0CE" style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Signal Engine Not Yet Connected</div>
          <div>{data.message}</div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#B0B0B0' }}>
            Run <code style={{ background: '#EBEBEA', padding: '1px 4px', borderRadius: 3 }}>python signal_engine/main.py</code> to start generating signals.
          </div>
        </div>
      )}

      {/* ── Signals tab ── */}
      {!loading && !error && data && !data.message && activeTab === 'signals' && (
        <>
          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
            <Pill label="Active Signals" value={signals.length} color="#1A1A1A" />
            <Pill label="Bullish" value={bullish.length} color="#16A34A" />
            <Pill label="Bearish" value={bearish.length} color="#DC2626" />
            <Pill label="Auto-Execute" value={autoExecCount} color={autoExecCount > 0 ? '#16A34A' : '#A0A0A0'} />
          </div>

          {signals.length === 0 ? (
            <div style={{ color: '#C0C0C0', fontSize: 12, textAlign: 'center', padding: '32px 0' }}>
              <Clock size={24} color="#D0D0CE" style={{ marginBottom: 8 }} />
              <div>No active on-chain signals right now.</div>
              <div style={{ marginTop: 4, fontSize: 11 }}>The engine runs daily at 05:00 UTC. Signals expire after their decay window.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {signals.map(sig => (
                <SignalCard key={sig.id} sig={sig} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Backtest tab ── */}
      {!loading && !error && data && !data.message && activeTab === 'backtest' && (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#6A6A6A', marginBottom: 8 }}>
              Accuracy stats from <strong>{data.totalClosed || 0}</strong> closed signal executions (last 90 days).
              Win = price moved in signal direction by &gt;1%.
            </div>
          </div>
          <BacktestTable rows={backtesting} />

          {/* Signal type summary */}
          {data.signalTypeStats && Object.keys(data.signalTypeStats).length > 0 && (
            <div style={{ marginTop: 16, borderTop: '1px solid #F5F5F4', paddingTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 10 }}>
                Signal Type Activity (Active window)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(data.signalTypeStats).map(([type, stats]) => {
                  const colors = signalTypeColor(type);
                  const confRate = stats.total > 0 ? Math.round((stats.executed / stats.total) * 100) : 0;
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px',
                        borderRadius: 8, background: colors.bg, color: colors.text, minWidth: 80, textAlign: 'center',
                      }}>
                        {signalTypeLabel(type)}
                      </span>
                      <span style={{ color: '#6A6A6A', flex: 1 }}>{stats.total} signals</span>
                      <span style={{ color: '#A0A0A0' }}>{confRate}% strategy-confirmed</span>
                      {stats.boosted > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '1px 6px', borderRadius: 6 }}>
                          {stats.boosted} ≥80%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 10, color: '#C0C0C0', borderTop: '1px solid #F5F5F4', paddingTop: 12 }}>
            Full backtesting CLI: <code style={{ background: '#F5F5F4', padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>python -m backtesting.backtest</code> — runs 90-day accuracy report against Binance OHLCV data.
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
