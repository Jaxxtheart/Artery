export default function TradeHistory({ trades = [] }) {
  const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
  const wins = trades.filter(t => t.pnl_usd > 0).length;
  const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(0) : 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm text-gray-400 tracking-widest uppercase">Trade History</h2>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Win Rate: <span className="text-green-400 font-medium">{winRate}%</span></span>
          <span>P&L: <span className={`font-medium ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnL >= 0 ? '+' : ''}{fmt(totalPnL)}
          </span></span>
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm">No completed trades yet</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-600 tracking-widest uppercase">
                <th className="text-left pb-3 pr-4">Symbol</th>
                <th className="text-left pb-3 pr-4">Strategy</th>
                <th className="text-right pb-3 pr-4">Entry</th>
                <th className="text-right pb-3 pr-4">Exit</th>
                <th className="text-right pb-3 pr-4">P&L</th>
                <th className="text-right pb-3">Duration</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const isProfitable = trade.pnl_usd >= 0;
                return (
                  <tr key={trade.id} className="border-t border-gray-800/50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{trade.symbol}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${trade.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {trade.side}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">{fmtDate(trade.exit_time)}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                        {trade.strategy}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-400">{fmt(trade.entry_price)}</td>
                    <td className="py-3 pr-4 text-right text-gray-400">{fmt(trade.exit_price)}</td>
                    <td className="py-3 pr-4 text-right">
                      <div className={`font-medium ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                        {isProfitable ? '+' : ''}{fmt(trade.pnl_usd)}
                      </div>
                      <div className={`text-xs ${isProfitable ? 'text-green-500/70' : 'text-red-500/70'}`}>
                        {isProfitable ? '+' : ''}{trade.pnl_pct?.toFixed(2)}%
                      </div>
                    </td>
                    <td className="py-3 text-right text-xs text-gray-500">
                      {trade.duration_hours ? `${trade.duration_hours.toFixed(1)}h` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
