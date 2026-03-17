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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
      <h2 className="text-sm text-gray-400 tracking-widest uppercase">Strategy Controls</h2>

      {/* Trading Toggle */}
      <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${tradingEnabled ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-sm text-gray-300">Auto Trading</span>
        </div>
        <button
          onClick={() => setTradingEnabled(!tradingEnabled)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            tradingEnabled
              ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400'
              : 'bg-gray-700 text-gray-400 hover:bg-green-500/20 hover:text-green-400'
          }`}
        >
          {tradingEnabled ? <><Pause size={12} /> Active</> : <><Play size={12} /> Paused</>}
        </button>
      </div>

      {/* Risk Metrics */}
      {riskMetrics && (
        <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 tracking-widest uppercase mb-1">
            <Shield size={12} />
            Risk Status
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-gray-600 mb-1">Positions</div>
              <div className="text-gray-300">
                {riskMetrics.positionCount} / {riskMetrics.maxAllowedPositions}
              </div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Exposure</div>
              <div className="text-gray-300">{riskMetrics.exposurePct?.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Stop Loss</div>
              <div className="text-red-400">{riskMetrics.stopLossPct}%</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Take Profit</div>
              <div className="text-green-400">{riskMetrics.takeProfitPct}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleRunCron}
          disabled={running === 'cron'}
          className="w-full flex items-center justify-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          <Zap size={15} />
          {running === 'cron' ? 'Running...' : 'Run Trading Cycle'}
        </button>

        <button
          onClick={handleSendReport}
          disabled={running === 'email'}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          <Mail size={15} />
          {running === 'email' ? 'Sending...' : 'Send Daily Report'}
        </button>
      </div>

      {/* Schedule Info */}
      <div className="text-xs text-gray-600 border-t border-gray-800 pt-4">
        <div className="flex items-center justify-between">
          <span>Daily execution</span>
          <span className="text-gray-500">10:00 PM UTC</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span>Monitored assets</span>
          <span className="text-gray-500">BTC ETH SOL AVAX MATIC</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span>Daily loss limit</span>
          <span className="text-red-500/70">8%</span>
        </div>
      </div>

      {lastRun && (
        <div className="text-xs text-gray-600 bg-gray-800/50 rounded-lg p-3">
          <div className="text-gray-400 font-medium mb-1">Last Run Result</div>
          <div>Signals: {lastRun.signalsAnalyzed}</div>
          <div>Trades: {lastRun.tradesExecuted}</div>
          <div>Closed: {lastRun.positionsClosed}</div>
        </div>
      )}
    </div>
  );
}
