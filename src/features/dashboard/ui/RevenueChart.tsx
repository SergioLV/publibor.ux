import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCLP } from '../../../shared/lib/format';

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  fontSize: '0.78rem',
  padding: '0.5rem 0.75rem',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};

interface Props {
  data: { date: string; total: number }[];
}

export default function RevenueChart({ data }: Props) {
  return (
    <div className="dash-panel">
      <div className="panel-header"><h3>Ingresos últimos 14 días</h3></div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [formatCLP(Number(value)), 'Ingresos']} labelStyle={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }} />
            <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: '#6366f1', stroke: '#000', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
