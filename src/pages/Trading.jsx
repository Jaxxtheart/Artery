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

const API_BASE = import.meta.env.VITE_API_URL || '';
const REFRESH_INTERVAL = 30000; // 30 seconds

export default function Trading() {
  const [status, setStatus] = useState(null);
  const [signals, setSignals] = useState([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
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

  useEffect(() => {
    fetchStatus();
    fetchSignals();

    const interval = setInterval(() => fetchStatus(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchSignals]);

  async function handleClosePosition(positionId) {
    const adminPassword = prompt('Enter admin password to close position:');
    if (!adminPassword) return;

    const res = await fetch(`${API_BASE}/api/trading/positions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminPassword}`
      },
      body: JSON.stringify({ positionId })
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      await fetchStatus();
    } else {
      alert(`Error: ${data.error}`);
    }
  }

  async function handleExecuteTrade(signal) {
    const adminPassword = prompt('Enter admin password to execute trade:');
    if (!adminPassword) return;

    const res = await fetch(`${API_BASE}/api/trading/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminPassword}`
      },
      body: JSON.stringify(signal)
    });
    const data = await res.json();
    if (data.success) {
      alert(`Trade executed: ${data.message}`);
      await fetchStatus();
      await fetchSignals();
    } else {
      alert(`Error: ${data.error}`);
    }
  }

  const isLoading = isLoadingStatus && !status;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-500 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight">Artery Wealth Builder</span>
                <span className="text-xs text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full">Live</span>
              </div>
              <div className="text-xs text-gray-600">Artery Capital Algorithmic Trading System</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-xs text-gray-600 hidden sm:block">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => fetchStatus()}
              disabled={isLoadingStatus}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-gray-800 hover:border-gray-600"
            >
              <RefreshCw size={13} className={isLoadingStatus ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 text-xs text-red-400 flex items-center gap-2">
          <span>⚠️</span>
          <span>Connection issue: {error}. Showing cached data.</span>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-gray-500 text-sm">Loading trading data...</div>
          </div>
        </div>
      ) : (
        <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

          {/* Row 1: Portfolio Summary */}
          <PortfolioSummary portfolio={status?.portfolio} />

          {/* Row 2: Chart + Strategy Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <LiveChart snapshots={status?.snapshots ? [status.snapshots] : []} />
            </div>
            <div>
              <StrategyControls
                riskMetrics={status?.riskMetrics}
                onRunCron={() => fetchStatus()}
              />
            </div>
          </div>

          {/* Row 3: Signals + Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SignalPanel
              signals={signals}
              onRefresh={fetchSignals}
              onExecute={handleExecuteTrade}
              isRefreshing={isRefreshingSignals}
            />
            <RiskMetrics
              riskMetrics={status?.riskMetrics}
              snapshots={[]}
            />
          </div>

          {/* Row 4: Open Positions */}
          <OpenPositions
            positions={status?.openPositions || []}
            onClosePosition={handleClosePosition}
          />

          {/* Row 5: Trade History + Strategy Performance */}
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
    </div>
  );
}

function StrategyPerformance({ performance = [] }) {
  const fmt = (v) => `$${parseFloat(v || 0).toFixed(2)}`;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-sm text-gray-400 tracking-widest uppercase mb-5">Strategy Performance</h2>
      {performance.length === 0 ? (
        <div className="text-gray-600 text-sm text-center py-8">No strategy data yet</div>
      ) : (
        <div className="space-y-4">
          {performance.map((strat) => (
            <div key={strat.strategy_name} className="border-b border-gray-800 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300 font-medium">{strat.strategy_name?.replace('_', ' ')}</span>
                <span className={`text-xs font-semibold ${strat.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {strat.total_pnl >= 0 ? '+' : ''}{fmt(strat.total_pnl)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                <div>
                  <div className="text-gray-600">Trades</div>
                  <div className="text-gray-400">{strat.total_trades}</div>
                </div>
                <div>
                  <div className="text-gray-600">Win Rate</div>
                  <div className="text-green-400">{strat.win_rate?.toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-gray-600">Sharpe</div>
                  <div className="text-gray-400">{strat.sharpe_ratio?.toFixed(2) || '—'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
