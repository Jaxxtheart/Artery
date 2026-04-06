export default function TradeHistory({ trades = [] }) {
  const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
  const wins = trades.filter(t => t.pnl_usd > 0).length;
  const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(0) : 0;

  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 11, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', margin: 0 }}>
          Trade History
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: '#8A8A8A' }}>
          <span>Win Rate: <span style={{ color: '#16A34A', fontWeight: 600 }}>{winRate}%</span></span>
          <span>P&L: <span style={{ fontWeight: 600, color: totalPnL >= 0 ? '#16A34A' : '#DC2626' }}>
            {totalPnL >= 0 ? '+' : ''}{fmt(totalPnL)}
          </span></span>
        </div>
      </div>

      {trades.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#C0C0C0' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 13, color: '#A0A0A0' }}>No completed trades yet</div>
          <div style={{ fontSize: 11, color: '#C0C0C0', marginTop: 6 }}>
            Trades appear here once open positions are closed via stop-loss, take-profit, or manually
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Symbol', 'Strategy', 'Entry', 'Exit', 'P&L', 'Duration'].map((h, i) => (
                  <th key={h} style={{ padding: '0 12px 10px', textAlign: i < 2 ? 'left' : 'right', fontSize: 10, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const isProfitable = trade.pnl_usd >= 0;
                return (
                  <tr key={trade.id} style={{ borderTop: '1px solid #F5F5F4' }}>
                    <td style={{ padding: '12px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 500, color: '#1A1A1A' }}>{trade.symbol}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20, background: trade.side === 'BUY' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', color: trade.side === 'BUY' ? '#16A34A' : '#DC2626' }}>
                          {trade.side}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: '#A0A0A0', marginTop: 2 }}>{fmtDate(trade.exit_time)}</div>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'top' }}>
                      <span style={{ fontSize: 10, color: '#8A8A8A', background: '#F5F5F4', padding: '3px 7px', borderRadius: 4 }}>
                        {trade.strategy}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#6A6A6A', verticalAlign: 'top' }}>{fmt(trade.entry_price)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#6A6A6A', verticalAlign: 'top' }}>{fmt(trade.exit_price)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, color: isProfitable ? '#16A34A' : '#DC2626' }}>
                        {isProfitable ? '+' : ''}{fmt(trade.pnl_usd)}
                      </div>
                      <div style={{ fontSize: 10, color: isProfitable ? '#16A34A' : '#DC2626', opacity: 0.7 }}>
                        {isProfitable ? '+' : ''}{trade.pnl_pct?.toFixed(2)}%
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#A0A0A0', fontSize: 11, verticalAlign: 'top' }}>
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
