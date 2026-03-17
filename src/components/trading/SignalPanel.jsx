import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function SignalBadge({ signal }) {
  const config = {
    BUY: { color: 'text-green-400 bg-green-500/20', Icon: TrendingUp },
    SELL: { color: 'text-red-400 bg-red-500/20', Icon: TrendingDown },
    HOLD: { color: 'text-gray-500 bg-gray-800', Icon: Minus }
  };
  const { color, Icon } = config[signal] || config.HOLD;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${color}`}>
      <Icon size={11} />
      {signal}
    </span>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 65 ? 'bg-yellow-500' : 'bg-gray-600';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function SignalPanel({ signals = [], onRefresh, onExecute, isRefreshing }) {
  const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v);

  const actionable = signals.filter(s => s.signal !== 'HOLD');
  const holds = signals.filter(s => s.signal === 'HOLD');

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm text-gray-400 tracking-widest uppercase">Trading Signals</h2>
          <p className="text-xs text-gray-600 mt-1">
            {actionable.length} actionable · {holds.length} monitoring
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800"
          title="Refresh signals"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {signals.length === 0 ? (
        <div className="text-center py-10 text-gray-600 text-sm">
          Click refresh to generate signals
        </div>
      ) : (
        <div className="space-y-3">
          {signals.map((signal, idx) => (
            <div
              key={`${signal.symbol}-${signal.strategy}-${idx}`}
              className={`border rounded-lg p-4 transition-colors ${
                signal.signal === 'BUY' ? 'border-green-500/20 bg-green-500/5' :
                signal.signal === 'SELL' ? 'border-red-500/20 bg-red-500/5' :
                'border-gray-800 bg-gray-800/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">{signal.symbol}</span>
                  <SignalBadge signal={signal.signal} />
                  <span className="text-xs text-gray-600 bg-gray-800/80 px-2 py-0.5 rounded">
                    {signal.strategy?.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-300">{signal.price > 0 ? fmt(signal.price) : '—'}</div>
                </div>
              </div>

              <ConfidenceBar value={signal.confidence} />

              <div className="text-xs text-gray-500 mt-2 leading-relaxed">{signal.reason}</div>

              {signal.signal === 'BUY' && signal.confidence >= 0.60 && onExecute && (
                <button
                  onClick={() => onExecute(signal)}
                  className="mt-3 w-full text-xs font-medium py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
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
