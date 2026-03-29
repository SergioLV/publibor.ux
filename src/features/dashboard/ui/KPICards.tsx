import { formatCLP } from '../../../shared/lib/format';

interface Props {
  unpaidTotal: number;
  unpaidCount: number;
  paidTotal: number;
  paidCount: number;
  ordersToday: number;
  totalOrders: number;
  emittedInvoices: number;
  pendingInvoices: number;
}

export default function KPICards(p: Props) {
  return (
    <div className="stat-grid">
      <div className="stat-card accent">
        <div className="stat-icon">💰</div>
        <div className="stat-content">
          <span className="stat-label">Por cobrar</span>
          <span className="stat-value">{formatCLP(p.unpaidTotal)}</span>
          <span className="stat-sub">{p.unpaidCount} órdenes pendientes</span>
        </div>
      </div>
      <div className="stat-card success">
        <div className="stat-icon">✅</div>
        <div className="stat-content">
          <span className="stat-label">Cobrado</span>
          <span className="stat-value">{formatCLP(p.paidTotal)}</span>
          <span className="stat-sub">{p.paidCount} órdenes pagadas</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">📋</div>
        <div className="stat-content">
          <span className="stat-label">Órdenes hoy</span>
          <span className="stat-value">{p.ordersToday}</span>
          <span className="stat-sub">{p.totalOrders} total</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">🧾</div>
        <div className="stat-content">
          <span className="stat-label">Facturas</span>
          <span className="stat-value">{p.emittedInvoices}</span>
          <span className="stat-sub">{p.pendingInvoices} pendientes</span>
        </div>
      </div>
    </div>
  );
}
