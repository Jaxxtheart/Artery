import { Shield, TrendingDown, Activity } from 'lucide-react';

function Gauge({ label, value, max, color, format }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-500">{label}</span>
        <span className={color}>{format ? format(value) : value}</span>
      </div>
      <div className="bg-gray-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color.includes('green') ? 'bg-green-500' : color.includes('red') ? 'bg-red-500' : color.includes('yellow') ? 'bg-yellow-500' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function RiskMetrics({ riskMetrics, snapshots = [] }) {
  const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);

  if (!riskMetrics) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="text-gray-600 text-sm">Loading risk metrics...</div>
      </div>
    );
  }

  const {
    positionCount = 0,
    maxAllowedPositions = 4,
    exposurePct = 0,
    totalPnL = 0,
    totalPnLPct = 0,
    stopLossPct = 3,
    takeProfitPct = 8,
    dailyLossLimit = 8
  } = riskMetrics;

  // Calculate portfolio performance from snapshots
  const sortedSnapshots = [...snapshots].sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date));
  const weeklyPnL = sortedSnapshots.length >= 7
    ? sortedSnapshots[sortedSnapshots.length - 1].total_value - sortedSnapshots[sortedSnapshots.length - 7].total_value
    : null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Shield size={15} className="text-indigo-400" />
        <h2 className="text-sm text-gray-400 tracking-widest uppercase">Risk Dashboard</h2>
      </div>

      {/* Gauge metrics */}
      <div className="space-y-4 mb-6">
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
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gray-800/40 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">Total P&L</div>
          <div className={`text-sm font-semibold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnL >= 0 ? '+' : ''}{fmt(totalPnL)}
          </div>
          <div className={`text-xs ${totalPnLPct >= 0 ? 'text-green-500/70' : 'text-red-500/70'}`}>
            {totalPnLPct >= 0 ? '+' : ''}{totalPnLPct?.toFixed(2)}%
          </div>
        </div>
        <div className="bg-gray-800/40 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">Weekly P&L</div>
          <div className={`text-sm font-semibold ${weeklyPnL === null ? 'text-gray-500' : weeklyPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {weeklyPnL === null ? '—' : `${weeklyPnL >= 0 ? '+' : ''}${fmt(weeklyPnL)}`}
          </div>
          <div className="text-xs text-gray-600">7-day change</div>
        </div>
        <div className="bg-gray-800/40 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">Stop Loss</div>
          <div className="text-sm font-semibold text-red-400">{stopLossPct}%</div>
          <div className="text-xs text-gray-600">Per position</div>
        </div>
        <div className="bg-gray-800/40 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">Take Profit</div>
          <div className="text-sm font-semibold text-green-400">{takeProfitPct}%</div>
          <div className="text-xs text-gray-600">Target R:R 2.67</div>
        </div>
      </div>

      {/* Daily loss circuit breaker */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
        <TrendingDown size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-xs font-medium text-red-400">Daily Loss Circuit Breaker</div>
          <div className="text-xs text-gray-600 mt-0.5">
            Auto-stops all trading if daily loss exceeds {dailyLossLimit}%
          </div>
        </div>
      </div>

      {/* Strategy indicators */}
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
        <Activity size={11} />
        <span>Strategies: MOMENTUM · MEAN_REVERSION · BREAKOUT</span>
      </div>
    </div>
  );
}
