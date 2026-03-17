import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function OpenPositions({ positions = [], onClosePosition }) {
  const [closingId, setClosingId] = useState(null);

  const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
  const fmtPct = (v) => `${v >= 0 ? '+' : ''}${v?.toFixed(2)}%`;

  async function handleClose(positionId) {
    if (!confirm('Force close this position at market price?')) return;
    setClosingId(positionId);
    try {
      await onClosePosition(positionId);
    } finally {
      setClosingId(null);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm text-gray-400 tracking-widest uppercase">Open Positions</h2>
        <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-1 rounded-full">
          {positions.length} / 4
        </span>
      </div>

      {positions.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-sm">No open positions</div>
          <div className="text-xs mt-1 text-gray-700">The strategy will enter positions when signals align</div>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((pos) => {
            const pnlUsd = pos.pnl_usd || 0;
            const pnlPct = pos.pnl_pct || 0;
            const isProfitable = pnlUsd >= 0;
            const nearStop = pos.stop_loss && pos.current_price && pos.current_price <= pos.stop_loss * 1.02;

            return (
              <div
                key={pos.id}
                className={`border rounded-lg p-4 ${nearStop ? 'border-red-500/40 bg-red-500/5' : 'border-gray-800 bg-gray-800/30'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{pos.symbol}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${pos.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {pos.side}
                      </span>
                      <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
                        {pos.strategy}
                      </span>
                    </div>
                    {nearStop && (
                      <div className="flex items-center gap-1 mt-1 text-red-400 text-xs">
                        <AlertTriangle size={12} />
                        Near stop loss
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                        {pnlUsd >= 0 ? '+' : ''}{fmt(pnlUsd)}
                      </div>
                      <div className={`text-xs ${isProfitable ? 'text-green-500/70' : 'text-red-500/70'}`}>
                        {fmtPct(pnlPct)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleClose(pos.id)}
                      disabled={closingId === pos.id}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded"
                      title="Force close position"
                    >
                      {closingId === pos.id ? (
                        <span className="text-xs text-gray-500">...</span>
                      ) : (
                        <X size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-gray-600 mb-1">Entry Price</div>
                    <div className="text-gray-300">{fmt(pos.entry_price)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Current Price</div>
                    <div className="text-gray-300">{pos.current_price ? fmt(pos.current_price) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Size</div>
                    <div className="text-gray-300">{pos.size?.toFixed(6)} {pos.symbol?.split('-')[0]}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Stop Loss</div>
                    <div className="text-red-400/80">{pos.stop_loss ? fmt(pos.stop_loss) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Take Profit</div>
                    <div className="text-green-400/80">{pos.take_profit ? fmt(pos.take_profit) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Opened</div>
                    <div className="text-gray-400">
                      {pos.entry_time ? new Date(pos.entry_time).toLocaleDateString() : '—'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
