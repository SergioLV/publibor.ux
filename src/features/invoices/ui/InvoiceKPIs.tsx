import { formatCLP } from '../../../shared/lib/format';

interface Props {
  grandTotal: number;
  total: number;
  emitted: number;
  emittedTotal: number;
  pending: number;
  pendingTotal: number;
  failed: number;
}

export default function InvoiceKPIs(p: Props) {
  return (
    <div className="fi-kpis">
      <div className="fi-kpi">
        <div className="fi-kpi-accent fi-kpi-accent-total" />
        <div className="fi-kpi-body">
          <span className="fi-kpi-label">Total facturado</span>
          <span className="fi-kpi-amount">{formatCLP(p.grandTotal)}</span>
          <span className="fi-kpi-meta">{p.total} documento{p.total !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="fi-kpi">
        <div className="fi-kpi-accent fi-kpi-accent-emitted" />
        <div className="fi-kpi-body">
          <span className="fi-kpi-label">Emitidas</span>
          <span className="fi-kpi-value">{p.emitted}</span>
          <span className="fi-kpi-meta">{formatCLP(p.emittedTotal)}</span>
        </div>
      </div>
      <div className="fi-kpi">
        <div className="fi-kpi-accent fi-kpi-accent-pending" />
        <div className="fi-kpi-body">
          <span className="fi-kpi-label">Pendientes</span>
          <span className="fi-kpi-value">{p.pending}</span>
          <span className="fi-kpi-meta">{formatCLP(p.pendingTotal)}</span>
        </div>
      </div>
      {p.failed > 0 && (
        <div className="fi-kpi">
          <div className="fi-kpi-accent fi-kpi-accent-failed" />
          <div className="fi-kpi-body">
            <span className="fi-kpi-label">Con error</span>
            <span className="fi-kpi-value">{p.failed}</span>
          </div>
        </div>
      )}
    </div>
  );
}
