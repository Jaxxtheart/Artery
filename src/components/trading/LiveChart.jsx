import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const INITIAL_CAPITAL = 1441;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  const pnl = value - INITIAL_CAPITAL;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <div className="text-gray-400 mb-1">{label}</div>
      <div className="text-white font-semibold">${value?.toFixed(2)}</div>
      <div className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
        {pnl >= 0 ? '+' : ''}${pnl?.toFixed(2)} ({((pnl / INITIAL_CAPITAL) * 100).toFixed(2)}%)
      </div>
    </div>
  );
}

export default function LiveChart({ snapshots = [] }) {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (snapshots.length === 0) {
      // Show placeholder data
      const now = new Date();
      const placeholder = Array.from({ length: 14 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (13 - i));
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: INITIAL_CAPITAL + (Math.random() - 0.3) * 100
        };
      });
      // Last point is current value
      placeholder[placeholder.length - 1].value = INITIAL_CAPITAL;
      setChartData(placeholder);
    } else {
      const sorted = [...snapshots].sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date));
      setChartData(sorted.map(s => ({
        date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: parseFloat(s.total_value)
      })));
    }
  }, [snapshots]);

  const currentValue = chartData[chartData.length - 1]?.value || INITIAL_CAPITAL;
  const pnl = currentValue - INITIAL_CAPITAL;
  const pnlPct = (pnl / INITIAL_CAPITAL) * 100;
  const isPositive = pnl >= 0;

  const minValue = Math.min(...chartData.map(d => d.value), INITIAL_CAPITAL) * 0.98;
  const maxValue = Math.max(...chartData.map(d => d.value), INITIAL_CAPITAL) * 1.02;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-sm text-gray-400 tracking-widest uppercase mb-1">Portfolio Performance</h2>
          <div className="text-2xl font-bold text-white">${currentValue.toFixed(2)}</div>
          <div className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}${pnl.toFixed(2)} ({isPositive ? '+' : ''}{pnlPct.toFixed(2)}%)
          </div>
        </div>
        {snapshots.length === 0 && (
          <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">Preview</span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? '#6366f1' : '#ef4444'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPositive ? '#6366f1' : '#ef4444'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minValue, maxValue]}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${v.toFixed(0)}`}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={INITIAL_CAPITAL}
            stroke="#374151"
            strokeDasharray="4 4"
            label={{ value: 'Entry', fill: '#6b7280', fontSize: 10, position: 'left' }}
          />
          <ReferenceLine
            y={2441}
            stroke="#6366f1"
            strokeDasharray="4 4"
            strokeOpacity={0.4}
            label={{ value: 'Target', fill: '#6366f1', fontSize: 10, position: 'left' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositive ? '#6366f1' : '#ef4444'}
            strokeWidth={2}
            fill="url(#portfolioGradient)"
            dot={false}
            activeDot={{ r: 4, fill: isPositive ? '#6366f1' : '#ef4444' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
