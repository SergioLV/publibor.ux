import { SERVICE_TYPES } from '../../../shared/types';
import { formatCLP } from '../../../shared/lib/format';

const SERVICE_COLORS: Record<string, string> = {
  DTF: '#818cf8', SUBLIMACION: '#f472b6', UV: '#38bdf8', TEXTURIZADO: '#fbbf24',
};

interface Props {
  byService: Record<string, { count: number; total: number; meters: number }>;
  maxServiceTotal: number;
}

export default function ServiceBreakdown({ byService, maxServiceTotal }: Props) {
  return (
    <div className="dash-panel">
      <div className="panel-header"><h3>Desglose por servicio</h3></div>
      <div className="service-breakdown">
        {SERVICE_TYPES.map((s) => {
          const data = byService[s];
          if (!data) return null;
          const pct = (data.total / maxServiceTotal) * 100;
          return (
            <div key={s} className="sb-row">
              <div className="sb-top">
                <span className="sb-dot" style={{ background: SERVICE_COLORS[s] }} />
                <span className="sb-name">{s}</span>
                <span className="sb-count">{data.count} órdenes</span>
                <span className="sb-total">{formatCLP(data.total)}</span>
              </div>
              <div className="sb-bar-track">
                <div className="sb-bar-fill" style={{ width: `${pct}%`, background: SERVICE_COLORS[s] }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
