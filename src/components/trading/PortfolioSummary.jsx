import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';

const PROFIT_GOAL = 1000; // target = initial capital + this

function MetricCard({ label, value, subValue, subColor, icon: Icon, iconColor }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{label}</span>
        {Icon && <Icon size={15} color={iconColor || '#C0C0C0'} />}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A' }}>{value}</div>
      {subValue && (
        <div style={{ fontSize: 12, marginTop: 4, color: subColor || '#A0A0A0' }}>{subValue}</div>
      )}
    </div>
  );
}

export default function PortfolioSummary({ portfolio }) {
  if (!portfolio) {
    return (
      <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24 }}>
        <div style={{ color: '#A0A0A0', fontSize: 13 }}>Loading portfolio…</div>
      </div>
    );
  }

  const { totalValue = 0, initialCapital = 0, totalPnL = 0, totalPnLPct = 0, liveAssets = [] } = portfolio;
  const target = initialCapital + PROFIT_GOAL;
  const progressPct = target > 0 ? Math.min((totalValue / target) * 100, 100) : 0;
  const isProfitable = totalPnL >= 0;
  const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <h2 style={{ fontSize: 11, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 20px' }}>
        Portfolio Overview
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
        <MetricCard
          label="Total Value"
          value={fmt(totalValue)}
          icon={DollarSign}
          iconColor="#FF5A5F"
        />
        <MetricCard
          label="Total P&L"
          value={`${isProfitable ? '+' : ''}${fmt(totalPnL)}`}
          subValue={`${isProfitable ? '+' : ''}${totalPnLPct.toFixed(2)}%`}
          subColor={isProfitable ? '#16A34A' : '#DC2626'}
          icon={isProfitable ? TrendingUp : TrendingDown}
          iconColor={isProfitable ? '#16A34A' : '#DC2626'}
        />
        <MetricCard
          label="Initial Capital"
          value={fmt(initialCapital)}
          subValue="Starting amount"
          icon={DollarSign}
          iconColor="#C0C0C0"
        />
        <MetricCard
          label="Target Profit"
          value={fmt(target)}
          subValue={`${progressPct.toFixed(1)}% reached`}
          icon={Target}
          iconColor="#FF5A5F"
        />
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#A0A0A0', marginBottom: 6 }}>
          <span>Progress to $1,000 profit goal</span>
          <span style={{ color: '#FF5A5F', fontWeight: 500 }}>{progressPct.toFixed(1)}%</span>
        </div>
        <div style={{ background: '#F5F5F4', borderRadius: 999, height: 6, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 999,
            background: 'linear-gradient(90deg, #FF5A5F 0%, #E34850 100%)',
            width: `${progressPct}%`, transition: 'width 0.7s',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#C0C0C0', marginTop: 4 }}>
          <span>{fmt(initialCapital)}</span>
          <span>{fmt(target)}</span>
        </div>
      </div>

      {/* Asset breakdown */}
      {liveAssets && liveAssets.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
            Asset Breakdown
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {liveAssets.filter(a => a.value_usd > 0.01).map((asset) => (
              <div key={asset.currency} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAF9', border: '1px solid #F0F0EE', borderRadius: 8, padding: '8px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,90,95,0.08)', border: '1px solid rgba(255,90,95,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#FF5A5F' }}>
                    {asset.currency.slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{asset.currency}</div>
                    <div style={{ fontSize: 11, color: '#A0A0A0' }}>
                      {asset.type === 'cash' ? 'Cash' : `${asset.balance?.toFixed(6)} units`}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{fmt(asset.value_usd)}</div>
                  {asset.price && <div style={{ fontSize: 11, color: '#A0A0A0' }}>{fmt(asset.price)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
