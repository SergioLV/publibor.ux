import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCLP } from '../../../shared/lib/format';

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  fontSize: '0.78rem',
  padding: '0.5rem 0.75rem',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};

interface ChartEntry {
  name: string;
  total: number;
  count: number;
  color: string;
}

interface Props {
  data: ChartEntry[];
}

export default function ServiceChart({ data }: Props) {
  return (
    <div className="dash-panel">
      <div className="panel-header"><h3>Ingresos por servicio</h3></div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barCategoryGap="25%">
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [formatCLP(Number(value)), 'Ingresos']} labelStyle={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }} />
            <Bar dataKey="total" radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
