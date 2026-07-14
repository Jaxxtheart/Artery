import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Clock, FlaskConical, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v ?? 0);

function Badge({ children, color, bg }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase',
      color, background: bg, padding: '3px 8px', borderRadius: 4
    }}>
      {children}
    </span>
  );
}

export default function StockTrading() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/trading/stock-status`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        setError(null);
      } else {
        setError(json.error || 'Failed to load stock status');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const card = { background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', margin: 0 }}>
            Stock Trading — Alpaca
          </h2>
          {data?.configured && data?.paper && (
            <Badge color="#B45309" bg="rgba(217,119,6,0.1)">
              <FlaskConical size={9} style={{ display: 'inline', marginRight: 3, verticalAlign: '-1px' }} />
              Paper
            </Badge>
          )}
          {data?.configured && data.market && (
            <Badge
              color={data.market.isOpen ? '#16A34A' : '#A0A0A0'}
              bg={data.market.isOpen ? 'rgba(22,163,74,0.08)' : '#F5F5F4'}
            >
              {data.market.isOpen ? 'Market open' : 'Market closed'}
            </Badge>
          )}
        </div>
        <button
          onClick={fetchStatus}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0A0A0', padding: 4 }}
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {loading && <div style={{ color: '#A0A0A0', fontSize: 13 }}>Loading stock trading status…</div>}

      {!loading && error && (
        <div style={{ color: '#DC2626', fontSize: 13 }}>{error}</div>
      )}

      {!loading && !error && data && !data.configured && (
        <div style={{ fontSize: 13, color: '#6B6B6B', lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 8px' }}>{data.message}</p>
          <p style={{ margin: 0, color: '#A0A0A0', fontSize: 12 }}>
            Watchlist ready: {data.watchlist?.join(', ')}. Strategies (Momentum, Mean Reversion, Breakout)
            run hourly during US market hours once keys are set.
          </p>
        </div>
      )}

      {!loading && !error && data?.configured && (
        <>
          {/* Account summary */}
          <div className="grid grid-cols-3 gap-4" style={{ marginBottom: 20 }}>
            {[
              { label: 'Equity', value: fmt(data.account.equity) },
              { label: 'Cash', value: fmt(data.account.cash) },
              { label: 'Buying Power', value: fmt(data.account.buyingPower) },
            ].map(m => (
              <div key={m.label} style={{ background: '#FAFAF9', border: '1px solid #F0F0EE', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Open positions */}
          <div style={{ fontSize: 10, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>
            Open Positions ({data.positions.length})
          </div>
          {data.positions.length === 0 ? (
            <div style={{ fontSize: 12, color: '#A0A0A0', marginBottom: 18 }}>
              No open stock positions. {data.market.isOpen
                ? 'Waiting for a signal ≥ 80% confidence.'
                : `Next market open: ${new Date(data.market.nextOpen).toLocaleString()}.`}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
              {data.positions.map(pos => {
                const up = pos.pnlUsd >= 0;
                return (
                  <div key={pos.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAF9', border: '1px solid #F0F0EE', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {up ? <TrendingUp size={14} color="#16A34A" /> : <TrendingDown size={14} color="#DC2626" />}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{pos.symbol}</div>
                        <div style={{ fontSize: 11, color: '#A0A0A0' }}>{pos.qty} shares @ {fmt(pos.entryPrice)}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{fmt(pos.marketValue)}</div>
                      <div style={{ fontSize: 11, color: up ? '#16A34A' : '#DC2626' }}>
                        {up ? '+' : ''}{fmt(pos.pnlUsd)} ({up ? '+' : ''}{pos.pnlPct.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent trades */}
          {data.recentTrades.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>
                Recent Trades
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.recentTrades.slice(0, 5).map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 2px', borderBottom: '1px solid #F5F5F4' }}>
                    <span style={{ color: '#1A1A1A', fontWeight: 500 }}>
                      {t.symbol} <span style={{ color: '#A0A0A0', fontWeight: 400 }}>{t.reason}</span>
                    </span>
                    <span style={{ color: t.pnl_usd >= 0 ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                      {t.pnl_usd >= 0 ? '+' : ''}{fmt(t.pnl_usd)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Watchlist footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, fontSize: 11, color: '#A0A0A0' }}>
            <Clock size={11} />
            <span>Watchlist: {data.watchlist.join(' · ')} — hourly during US market hours</span>
          </div>
        </>
      )}
    </div>
  );
}
