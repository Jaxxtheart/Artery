import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';

const INITIAL_CAPITAL = 1441;
const TARGET = 2441;

function MetricCard({ label, value, subValue, subColor, icon: Icon, iconColor }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-xs tracking-widest uppercase">{label}</span>
        {Icon && <Icon size={16} className={iconColor || 'text-gray-600'} />}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subValue && (
        <div className={`text-sm mt-1 ${subColor || 'text-gray-400'}`}>{subValue}</div>
      )}
    </div>
  );
}

export default function PortfolioSummary({ portfolio }) {
  if (!portfolio) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="text-gray-500 text-sm">Loading portfolio...</div>
      </div>
    );
  }

  const { totalValue = 0, initialCapital = INITIAL_CAPITAL, totalPnL = 0, totalPnLPct = 0, liveAssets = [] } = portfolio;
  const progressPct = Math.min((totalValue / TARGET) * 100, 100);
  const isProfitable = totalPnL >= 0;

  const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-sm text-gray-400 tracking-widest uppercase mb-5">Portfolio Overview</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Value"
          value={fmt(totalValue)}
          icon={DollarSign}
          iconColor="text-indigo-400"
        />
        <MetricCard
          label="Total P&L"
          value={`${isProfitable ? '+' : ''}${fmt(totalPnL)}`}
          subValue={`${isProfitable ? '+' : ''}${totalPnLPct.toFixed(2)}%`}
          subColor={isProfitable ? 'text-green-400' : 'text-red-400'}
          icon={isProfitable ? TrendingUp : TrendingDown}
          iconColor={isProfitable ? 'text-green-400' : 'text-red-400'}
        />
        <MetricCard
          label="Initial Capital"
          value={fmt(INITIAL_CAPITAL)}
          subValue="Starting amount"
          icon={DollarSign}
          iconColor="text-gray-600"
        />
        <MetricCard
          label="Target Profit"
          value={fmt(TARGET)}
          subValue={`${progressPct.toFixed(1)}% reached`}
          icon={Target}
          iconColor="text-indigo-400"
        />
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Progress to $1,000 profit goal</span>
          <span className="text-indigo-400">{progressPct.toFixed(1)}%</span>
        </div>
        <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>{fmt(INITIAL_CAPITAL)}</span>
          <span>{fmt(TARGET)}</span>
        </div>
      </div>

      {/* Asset breakdown */}
      {liveAssets && liveAssets.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 tracking-widest uppercase mb-3">Asset Breakdown</div>
          <div className="space-y-2">
            {liveAssets.filter(a => a.value_usd > 0.01).map((asset) => (
              <div key={asset.currency} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-2">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-xs font-bold">
                    {asset.currency.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{asset.currency}</div>
                    <div className="text-xs text-gray-500">
                      {asset.type === 'cash' ? 'Cash' : `${asset.balance?.toFixed(6)} units`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">{fmt(asset.value_usd)}</div>
                  {asset.price && (
                    <div className="text-xs text-gray-500">{fmt(asset.price)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
