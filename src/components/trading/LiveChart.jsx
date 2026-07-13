import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

const PROFIT_GOAL = 1000; // target line = initial capital + this

function CustomTooltip({ active, payload, label, initialCapital }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  const pnl = value - initialCapital;
  const pnlPct = initialCapital > 0 ? (pnl / initialCapital) * 100 : 0;
  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 8, padding: '8px 12px', fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <div style={{ color: '#A0A0A0', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600, color: '#1A1A1A' }}>${value?.toFixed(2)}</div>
      <div style={{ color: pnl >= 0 ? '#16A34A' : '#DC2626' }}>
        {pnl >= 0 ? '+' : ''}${pnl?.toFixed(2)} ({pnlPct.toFixed(2)}%)
      </div>
    </div>
  );
}

export default function LiveChart({ snapshots = [], initialCapital = 0 }) {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (snapshots.length === 0) {
      const now = new Date();
      const base = initialCapital || 1000;
      const placeholder = Array.from({ length: 14 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (13 - i));
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: base + (Math.random() - 0.3) * 100,
        };
      });
      placeholder[placeholder.length - 1].value = base;
      setChartData(placeholder);
    } else {
      const sorted = [...snapshots].sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date));
      setChartData(sorted.map(s => ({
        date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: parseFloat(s.total_value),
      })));
    }
  }, [snapshots, initialCapital]);

  const currentValue = chartData[chartData.length - 1]?.value || initialCapital;
  const pnl = currentValue - initialCapital;
  const pnlPct = initialCapital > 0 ? (pnl / initialCapital) * 100 : 0;
  const isPositive = pnl >= 0;

  const minValue = Math.min(...chartData.map(d => d.value), initialCapital) * 0.98;
  const maxValue = Math.max(...chartData.map(d => d.value), initialCapital) * 1.02;

  const lineColor = isPositive ? '#FF5A5F' : '#DC2626';

  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: '#A0A0A0', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 6px' }}>
            Portfolio Performance
          </h2>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A' }}>${currentValue.toFixed(2)}</div>
          <div style={{ fontSize: 13, color: isPositive ? '#16A34A' : '#DC2626' }}>
            {isPositive ? '+' : ''}${pnl.toFixed(2)} ({isPositive ? '+' : ''}{pnlPct.toFixed(2)}%)
          </div>
        </div>
        {snapshots.length === 0 && (
          <span style={{ fontSize: 10, color: '#A0A0A0', background: '#F5F5F4', padding: '3px 8px', borderRadius: 4 }}>Preview</span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={lineColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#C0C0C0', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minValue, maxValue]}
            tick={{ fill: '#C0C0C0', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${v.toFixed(0)}`}
            width={55}
          />
          <Tooltip content={<CustomTooltip initialCapital={initialCapital} />} />
          <ReferenceLine
            y={initialCapital}
            stroke="#EBEBEA"
            strokeDasharray="4 4"
            label={{ value: 'Entry', fill: '#C0C0C0', fontSize: 10, position: 'left' }}
          />
          <ReferenceLine
            y={initialCapital + PROFIT_GOAL}
            stroke="#FF5A5F"
            strokeDasharray="4 4"
            strokeOpacity={0.3}
            label={{ value: 'Target', fill: '#FF5A5F', fontSize: 10, position: 'left' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            fill="url(#portfolioGradient)"
            dot={false}
            activeDot={{ r: 4, fill: lineColor, stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
