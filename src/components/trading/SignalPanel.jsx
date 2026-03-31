import { useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Wallet, FlaskConical } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

function SignalBadge({ signal }) {
  const config = {
    BUY:  { bg: 'rgba(22,163,74,0.08)',  color: '#16A34A', Icon: TrendingUp },
    SELL: { bg: 'rgba(220,38,38,0.08)',  color: '#DC2626', Icon: TrendingDown },
    HOLD: { bg: '#F5F5F4',               color: '#A0A0A0', Icon: Minus },
  };
  const { bg, color, Icon } = config[signal] || config.HOLD;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: bg, color }}>
      <Icon size={10} />
      {signal}
    </span>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#16A34A' : pct >= 65 ? '#D97706' : '#C0C0C0';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, background: '#F5F5F4', borderRadius: 999, height: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, background: color, width: `${pct}%`, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 10, color: '#A0A0A0', width: 28, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

function getActionContext(signal, openPositions = [], liveAssets = []) {
  const ticker = signal.symbol.replace('-USD', '');
  const hasTrackedPosition = openPositions.some(p => p.symbol === signal.symbol && p.status === 'OPEN');
  const hasHolding = liveAssets.some(a => a.currency === ticker && a.balance > 0);

  if (signal.signal === 'BUY') {
    if (signal.confidence >= 0.60) {
      return {
        text: 'Queued for auto-execution — the hourly bot will buy this using available USD cash if fewer than 4 positions are open.',
        color: '#16A34A',
      };
    }
    return {
      text: `Confidence is ${Math.round(signal.confidence * 100)}% — below the 60% minimum threshold. Bot is monitoring but will not execute.`,
      color: '#D97706',
    };
  }

  if (signal.signal === 'SELL') {
    if (hasTrackedPosition) {
      return {
        text: 'Bot will auto-close this position at the next hourly run since it was opened by the bot.',
        color: '#DC2626',
      };
    }
    if (hasHolding) {
      return {
        text: `You hold ${ticker} but it wasn't opened by the bot — it won't sell automatically. Use Execute Sell to action this manually.`,
        color: '#DC2626',
      };
    }
    return {
      text: `Market signal only — you don't hold ${ticker} so this cannot be executed.`,
      color: '#A0A0A0',
    };
  }

  return {
    text: 'No entry conditions met yet — bot is monitoring for alignment.',
    color: '#A0A0A0',
  };
}

export default function SignalPanel({ signals = [], openPositions = [], liveAssets = [], onRefresh, onExecute, isRefreshing }) {
  const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v);

  const [testResults, setTestResults] = useState({});   // { [symbol-side]: { loading, data } }
  const [adminPw, setAdminPw] = useState(null);

  async function runTest(signal) {
    const key = `${signal.symbol}-${signal.signal}`;
    let pw = adminPw;
    if (!pw) {
      pw = prompt('Enter admin password to run test:');
      if (!pw) return;
      setAdminPw(pw);
    }
    setTestResults(prev => ({ ...prev, [key]: { loading: true, data: null } }));
    try {
      const res = await fetch(`${API_BASE}/api/trading/test-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pw}` },
        body: JSON.stringify({ symbol: signal.symbol, side: signal.signal, confidence: signal.confidence }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { success: false, would_succeed: false, error: `Server returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}` };
      }
      setTestResults(prev => ({ ...prev, [key]: { loading: false, data } }));
    } catch (e) {
      setTestResults(prev => ({ ...prev, [key]: { loading: false, data: { success: false, error: e.message } } }));
    }
  }
  const errorSignals = signals.filter(s => s.strategy === 'ERROR');
  const hasApiError = errorSignals.length > 0 && errorSignals.length === signals.length;
  const apiErrorMsg = hasApiError ? errorSignals[0]?.reason : null;
  const validSignals = hasApiError ? [] : signals;
  const actionable = validSignals.filter(s => s.signal !== 'HOLD');
  const holds = validSignals.filter(s => s.signal === 'HOLD');
  const heldActionable = actionable.filter(s => s.held);

  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', margin: 0 }}>
            Trading Signals
          </h2>
          <p style={{ fontSize: 11, color: '#C0C0C0', margin: '4px 0 0' }}>
            {actionable.length} actionable · {holds.length} monitoring
            {heldActionable.length > 0 && (
              <span style={{ color: '#7C3AED', marginLeft: 6 }}>· {heldActionable.length} from your holdings</span>
            )}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{ color: '#C0C0C0', background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#2C2C2C'}
          onMouseLeave={e => e.currentTarget.style.color = '#C0C0C0'}
          title="Refresh signals"
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {hasApiError ? (
        <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>Coinbase API not connected</div>
          <div style={{ fontSize: 11, color: '#92400E', lineHeight: 1.5 }}>
            {apiErrorMsg?.includes('401')
              ? 'Invalid API credentials. Add COINBASE_API_KEY and COINBASE_API_SECRET to your Vercel environment variables.'
              : apiErrorMsg}
          </div>
        </div>
      ) : validSignals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#C0C0C0', fontSize: 13 }}>
          Click refresh to generate signals
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {validSignals.map((signal, idx) => {
            const ticker = signal.symbol.replace('-USD', '');
            const context = getActionContext(signal, openPositions, liveAssets);
            const hasTrackedPosition = openPositions.some(p => p.symbol === signal.symbol && p.status === 'OPEN');
            const hasHolding = liveAssets.some(a => a.currency === ticker && a.balance > 0);
            const showExecute = onExecute && (
              (signal.signal === 'BUY' && signal.confidence >= 0.60) ||
              (signal.signal === 'SELL' && (hasTrackedPosition || hasHolding))
            );
            return (
              <div key={`${signal.symbol}-${signal.strategy}-${idx}`} style={{
                border: `1px solid ${signal.signal === 'BUY' ? 'rgba(22,163,74,0.15)' : signal.signal === 'SELL' ? 'rgba(220,38,38,0.15)' : '#EBEBEA'}`,
                background: signal.signal === 'BUY' ? 'rgba(22,163,74,0.03)' : signal.signal === 'SELL' ? 'rgba(220,38,38,0.03)' : '#FAFAF9',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{signal.symbol}</span>
                    <SignalBadge signal={signal.signal} />
                    <span style={{ fontSize: 10, color: '#A0A0A0', background: '#F5F5F4', padding: '2px 6px', borderRadius: 4 }}>
                      {signal.strategy?.replace('_', ' ')}
                    </span>
                    {signal.held && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: '#7C3AED', background: 'rgba(124,58,237,0.08)', padding: '2px 6px', borderRadius: 4 }}>
                        <Wallet size={9} />
                        HELD
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#4A4A4A' }}>{signal.price > 0 ? fmt(signal.price) : '—'}</div>
                </div>

                <ConfidenceBar value={signal.confidence} />

                <div style={{ fontSize: 11, color: '#8A8A8A', marginTop: 6, lineHeight: 1.5 }}>{signal.reason}</div>

                <div style={{
                  marginTop: 8, padding: '7px 10px', borderRadius: 6,
                  background: signal.signal === 'HOLD' ? '#F5F5F4' : `${context.color}12`,
                  borderLeft: `2px solid ${context.color}`,
                  fontSize: 11, color: context.color, lineHeight: 1.5,
                }}>
                  {context.text}
                </div>

                {showExecute && (() => {
                  const testKey = `${signal.symbol}-${signal.signal}`;
                  const test = testResults[testKey];
                  const isBuy = signal.signal === 'BUY';
                  const activeColor = isBuy ? '#16A34A' : '#DC2626';
                  const activeBg   = isBuy ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)';
                  const activeBgHover = isBuy ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)';
                  const activeBorder = isBuy ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)';
                  return (
                    <>
                      {/* Test result panel */}
                      {test && !test.loading && test.data && (
                        <div style={{ marginTop: 10, borderRadius: 6, border: `1px solid ${test.data.would_succeed ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`, background: test.data.would_succeed ? 'rgba(22,163,74,0.04)' : 'rgba(220,38,38,0.04)', padding: '10px 12px', fontSize: 11 }}>
                          <div style={{ fontWeight: 600, color: test.data.would_succeed ? '#16A34A' : '#DC2626', marginBottom: 6 }}>
                            {test.data.would_succeed ? '✓ Order would succeed' : '✗ Order would fail'}
                          </div>
                          {test.data.order_params && (
                            <div style={{ color: '#6A6A6A', marginBottom: 4 }}>
                              Size: <strong>{test.data.order_params.orderSizeLabel}</strong> via <strong>{test.data.order_params.size_field}</strong> @ {test.data.order_params.currentPrice ? `$${test.data.order_params.currentPrice}` : '—'}
                            </div>
                          )}
                          {test.data.failed_checks?.length > 0 && (
                            <div style={{ color: '#DC2626', marginBottom: 4 }}>Failed: {test.data.failed_checks.join(', ')}</div>
                          )}
                          {test.data.checks?.risk_reason && (
                            <div style={{ color: '#DC2626' }}>Risk: {test.data.checks.risk_reason}</div>
                          )}
                          {test.data.preview_error && (
                            <div style={{ color: '#DC2626', wordBreak: 'break-all', marginTop: 4 }}>
                              Coinbase: {test.data.preview_error}
                            </div>
                          )}
                          {test.data.coinbase_preview && (
                            <details style={{ marginTop: 6 }}>
                              <summary style={{ cursor: 'pointer', color: '#A0A0A0' }}>Coinbase preview response</summary>
                              <pre style={{ fontSize: 10, marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#6A6A6A' }}>
                                {JSON.stringify(test.data.coinbase_preview, null, 2)}
                              </pre>
                            </details>
                          )}
                          {test.data.error && !test.data.would_succeed && (
                            <div style={{ color: '#DC2626', wordBreak: 'break-all' }}>{test.data.error}</div>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {/* Test button */}
                        <button
                          onClick={() => runTest(signal)}
                          disabled={test?.loading}
                          style={{ flex: 1, fontSize: 12, fontWeight: 500, padding: '7px 0', borderRadius: 6, background: 'transparent', color: '#6A6A6A', border: '1px solid #E0E0DE', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F5F5F4'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <FlaskConical size={11} />
                          {test?.loading ? 'Testing…' : 'Test Order'}
                        </button>

                        {/* Execute button */}
                        <button
                          onClick={() => onExecute(signal)}
                          style={{ flex: 2, fontSize: 12, fontWeight: 500, padding: '7px 0', borderRadius: 6, background: activeBg, color: activeColor, border: `1px solid ${activeBorder}`, cursor: 'pointer', transition: 'background 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.background = activeBgHover}
                          onMouseLeave={e => e.currentTarget.style.background = activeBg}
                        >
                          {isBuy ? 'Execute Buy' : 'Execute Sell'}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
