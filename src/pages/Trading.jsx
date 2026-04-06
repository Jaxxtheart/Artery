import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import PortfolioSummary from '../components/trading/PortfolioSummary';
import OpenPositions from '../components/trading/OpenPositions';
import TradeHistory from '../components/trading/TradeHistory';
import LiveChart from '../components/trading/LiveChart';
import SignalPanel from '../components/trading/SignalPanel';
import StrategyControls from '../components/trading/StrategyControls';
import RiskMetrics from '../components/trading/RiskMetrics';
import HoldingsAnalysis from '../components/trading/HoldingsAnalysis';
import OnChainSignals from '../components/trading/OnChainSignals';

const API_BASE = import.meta.env.VITE_API_URL || '';
const REFRESH_INTERVAL = 30000;

function ArteryLogo() {
  return (
    <svg viewBox="0 0 500 160" xmlns="http://www.w3.org/2000/svg" width="180">
      <defs>
        <linearGradient id="flowGradTrading" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#FF5A5F', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#E34850', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <circle cx="85" cy="80" r="55" fill="none" stroke="#FF5A5F" strokeWidth="2" opacity="0.3" />
      <g transform="translate(40, 45)">
        <path
          d="M 20 55 C 20 40, 25 25, 35 15 C 40 8, 45 8, 50 15 C 55 22, 57 30, 55 40 L 50 52 M 30 52 C 32 35, 38 28, 45 28 C 52 28, 58 35, 60 52 M 30 52 C 30 58, 32 62, 35 65 C 40 70, 50 70, 55 65 C 58 62, 60 58, 60 52"
          stroke="url(#flowGradTrading)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
        <path d="M 35 15 Q 25 12, 18 18" stroke="#FF5A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M 50 15 Q 60 12, 67 18" stroke="#FF5A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />
        <circle cx="45" cy="28" r="2" fill="#FF5A5F">
          <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>
      <text x="160" y="85" fontFamily="'Helvetica Neue', Arial, sans-serif" fontSize="42" fontWeight="500" fill="#2C2C2C" letterSpacing="1">
        Artery Capital
      </text>
      <path d="M 160 95 L 440 95" stroke="#FF5A5F" strokeWidth="1.5" opacity="0.3" />
    </svg>
  );
}

export default function Trading() {
  const [status, setStatus] = useState(null);
  const [signals, setSignals] = useState([]);
  const [costBasis, setCostBasis] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isLoadingCostBasis, setIsLoadingCostBasis] = useState(true);
  const [isRefreshingSignals, setIsRefreshingSignals] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingStatus(true);
    try {
      const res = await fetch(`${API_BASE}/api/trading/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  const fetchSignals = useCallback(async () => {
    setIsRefreshingSignals(true);
    try {
      const res = await fetch(`${API_BASE}/api/trading/signals`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSignals(data.signals || []);
    } catch (err) {
      console.error('Signals error:', err);
    } finally {
      setIsRefreshingSignals(false);
    }
  }, []);

  const fetchCostBasis = useCallback(async () => {
    setIsLoadingCostBasis(true);
    try {
      const res = await fetch(`${API_BASE}/api/coinbase/cost-basis`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) setCostBasis(data);
    } catch (err) {
      console.error('Cost basis error:', err);
    } finally {
      setIsLoadingCostBasis(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchSignals();
    fetchCostBasis();
    const interval = setInterval(() => fetchStatus(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchSignals, fetchCostBasis]);

  async function handleClosePosition(positionId) {
    const adminPassword = prompt('Enter admin password to close position:');
    if (!adminPassword) return;
    const res = await fetch(`${API_BASE}/api/trading/positions`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminPassword}` },
      body: JSON.stringify({ positionId })
    });
    const data = await res.json();
    if (data.success) { alert(data.message); await fetchStatus(); }
    else alert(`Error: ${data.error}`);
  }

  async function handleExecuteTrade(signal) {
    const adminPassword = prompt('Enter admin password to execute trade:');
    if (!adminPassword) return;

    const isSell = signal.signal === 'SELL';

    // Optimistically remove SELL signal immediately so the UI feels instant
    if (isSell) {
      setSignals(prev => prev.filter(s => !(s.symbol === signal.symbol && s.signal === 'SELL')));
    }

    const res = await fetch(`${API_BASE}/api/trading/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminPassword}` },
      body: JSON.stringify({ ...signal, side: signal.signal })
    });
    const data = await res.json();

    if (data.success) {
      const warn = data.db_warnings?.length ? `\n\n⚠️ DB warning (order succeeded): ${data.db_warnings.join('; ')}` : '';
      alert(`Trade executed: ${data.message}${warn}`);
      // Refresh positions/trade-history, signals (with 4h cooldown filter), and cost-basis
      await Promise.all([fetchStatus(), fetchSignals(), ...(isSell ? [fetchCostBasis()] : [])]);
    } else {
      // Restore the signal if the sell actually failed
      if (isSell) await fetchSignals();
      const detail = data.details ? `\n\nCoinbase response:\n${JSON.stringify(data.details, null, 2)}` : '';
      alert(`Error: ${data.error}${detail}`);
    }
  }

  const isLoading = isLoadingStatus && !status;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #FFFFFF 0%, #F8F8F6 100%)', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>

      {/* ── Sticky header ── */}
      <header style={{
        background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #EBEBEA', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Left: back + logo + page label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link to="/" style={{ color: '#B0B0B0', display: 'flex', alignItems: 'center', transition: 'color 0.2s', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = '#2C2C2C'}
              onMouseLeave={e => e.currentTarget.style.color = '#B0B0B0'}
            >
              <ArrowLeft size={18} />
            </Link>

            <div style={{ width: 1, height: 28, background: '#EBEBEA' }} />

            <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              <ArteryLogo />
            </Link>

            <div style={{ width: 1, height: 28, background: '#EBEBEA' }} />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.2px' }}>
                  Wealth Builder
                </span>
                <span style={{
                  background: '#FF5A5F', color: '#fff', fontSize: 9, fontWeight: 700,
                  letterSpacing: '1.2px', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20,
                }}>Live</span>
              </div>
              <div style={{ fontSize: 11, color: '#A0A0A0', marginTop: 1 }}>
                Algorithmic Trading System · Coinbase
              </div>
            </div>
          </div>

          {/* Right: last updated + refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: '#A0A0A0' }}>
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => fetchStatus()}
              disabled={isLoadingStatus}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: '#6A6A6A', background: 'transparent',
                border: '1px solid #E0E0DE', borderRadius: 6,
                padding: '6px 12px', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F5F5F4'; e.currentTarget.style.color = '#2C2C2C'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6A6A6A'; }}
            >
              <RefreshCw size={12} className={isLoadingStatus ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ background: '#FEF2F2', borderBottom: '1px solid #FECACA', padding: '10px 32px', fontSize: 12, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⚠</span>
          <span>Connection issue: {error}. Showing cached data.</span>
        </div>
      )}

      {/* ── Main content ── */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #EBEBEA', borderTopColor: '#FF5A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
            <div style={{ color: '#A0A0A0', fontSize: 13, marginTop: 16 }}>Loading trading data…</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Row 1: Portfolio Summary */}
          <PortfolioSummary portfolio={status?.portfolio} />

          {/* Row 2: Holdings Analysis */}
          <HoldingsAnalysis
            holdings={costBasis?.holdings || []}
            summary={costBasis?.summary || null}
            cashAvailable={status?.portfolio?.liveAssets?.find(a => a.type === 'cash')?.value_usd || 0}
            isLoading={isLoadingCostBasis}
            onRefresh={fetchCostBasis}
          />

          {/* Row 3: Chart + Strategy Controls */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <LiveChart snapshots={status?.snapshots || []} />
            </div>
            <div>
              <StrategyControls riskMetrics={status?.riskMetrics} onRunCron={() => fetchStatus()} />
            </div>
          </div>

          {/* Row 3: Signals + Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SignalPanel signals={signals} openPositions={status?.openPositions || []} liveAssets={status?.portfolio?.liveAssets || []} onRefresh={fetchSignals} onExecute={handleExecuteTrade} isRefreshing={isRefreshingSignals} />
            <RiskMetrics riskMetrics={status?.riskMetrics} snapshots={status?.snapshots || []} />
          </div>

          {/* Row 4: On-Chain Signal Engine + Backtesting */}
          <OnChainSignals />

          {/* Row 5: Open Positions */}
          <OpenPositions positions={status?.openPositions || []} onClosePosition={handleClosePosition} />

          {/* Row 6: Trade History + Strategy Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TradeHistory trades={status?.recentTrades || []} />
            </div>
            <div>
              <StrategyPerformance performance={status?.strategyPerformance || []} />
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid #EBEBEA', padding: '32px', textAlign: 'center', marginTop: 24 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <svg viewBox="0 0 500 160" xmlns="http://www.w3.org/2000/svg" width="140">
            <defs>
              <linearGradient id="flowGradTradingFooter" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#FF5A5F', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#E34850', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <circle cx="85" cy="80" r="55" fill="none" stroke="#FF5A5F" strokeWidth="2" opacity="0.2" />
            <g transform="translate(40, 45)">
              <path d="M 20 55 C 20 40, 25 25, 35 15 C 40 8, 45 8, 50 15 C 55 22, 57 30, 55 40 L 50 52 M 30 52 C 32 35, 38 28, 45 28 C 52 28, 58 35, 60 52 M 30 52 C 30 58, 32 62, 35 65 C 40 70, 50 70, 55 65 C 58 62, 60 58, 60 52"
                stroke="url(#flowGradTradingFooter)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <text x="160" y="85" fontFamily="'Helvetica Neue', Arial, sans-serif" fontSize="42" fontWeight="500" fill="#C0C0C0" letterSpacing="1">Artery Capital</text>
            <path d="M 160 95 L 440 95" stroke="#FF5A5F" strokeWidth="1.5" opacity="0.2" />
          </svg>
        </Link>
        <p style={{ color: '#C0C0C0', fontSize: 12, marginTop: 8 }}>© 2026 Artery Capital · Wealth Builder</p>
      </div>
    </div>
  );
}

function StrategyPerformance({ performance = [] }) {
  const fmt = (v) => `$${parseFloat(v || 0).toFixed(2)}`;
  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <h2 style={{ fontSize: 11, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 20, margin: '0 0 20px' }}>
        Strategy Performance
      </h2>
      {performance.length === 0 ? (
        <div style={{ color: '#C0C0C0', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>No strategy data yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {performance.map((strat) => (
            <div key={strat.strategy_name} style={{ borderBottom: '1px solid #F5F5F4', paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#2C2C2C', fontWeight: 500 }}>{strat.strategy_name?.replace('_', ' ')}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: strat.total_pnl >= 0 ? '#16A34A' : '#DC2626' }}>
                  {strat.total_pnl >= 0 ? '+' : ''}{fmt(strat.total_pnl)}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 11 }}>
                <div>
                  <div style={{ color: '#A0A0A0', marginBottom: 2 }}>Trades</div>
                  <div style={{ color: '#6A6A6A' }}>{strat.total_trades}</div>
                </div>
                <div>
                  <div style={{ color: '#A0A0A0', marginBottom: 2 }}>Win Rate</div>
                  <div style={{ color: '#16A34A' }}>{strat.win_rate?.toFixed(0)}%</div>
                </div>
                <div>
                  <div style={{ color: '#A0A0A0', marginBottom: 2 }}>Sharpe</div>
                  <div style={{ color: '#6A6A6A' }}>{strat.sharpe_ratio?.toFixed(2) || '—'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
