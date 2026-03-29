import type { Order } from '../model/types';
import type { Client } from '../../clients/model/types';
import type { ServiceType } from '../../../shared/types';
import { unitLabel, serviceLabel } from '../../../shared/types';
import { formatCLP, formatDateShort } from '../../../shared/lib/format';

interface OrderMobileCardsProps {
  orders: Order[];
  loading: boolean;
  selected: Set<string>;
  clientMap: Record<string, Client>;
  userRole?: string;
  onToggleSelect: (id: string) => void;
  onOpenEdit: (order: Order) => void;
  onTogglePaid: (order: Order) => void;
}

export default function OrderMobileCards({
  orders, loading, selected, clientMap, userRole,
  onToggleSelect, onOpenEdit, onTogglePaid,
}: OrderMobileCardsProps) {
  return (
    <div className="mobile-order-cards">
      {loading && Array.from({ length: 4 }).map((_, i) => (
        <div key={`mskel-${i}`} className="mobile-order-card skeleton-card" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="skeleton-cell wide" />
          <div className="skeleton-cell medium" />
          <div className="skeleton-cell short" />
        </div>
      ))}
      {!loading && orders.map((o, idx) => (
        <div
          key={o.id}
          className={`mobile-order-card fade-in-row ${selected.has(o.id) ? 'card-selected' : ''} ${!o.is_paid ? 'card-clickable' : ''}`}
          style={{ animationDelay: `${idx * 0.03}s` }}
          onClick={() => !o.is_paid && onOpenEdit(o)}
        >
          <div className="moc-top">
            <div className="moc-check" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={selected.has(o.id)} onChange={() => onToggleSelect(o.id)} />
            </div>
            <div className="moc-info">
              <div className="moc-row-top">
                <span className="moc-id">#{o.id}</span>
                <span className={`service-pill ${o.service.toLowerCase()}`}>{serviceLabel(o.service)}</span>
                {userRole !== 'operator' && o.invoice_id && <span className="invoice-badge">Facturada</span>}
              </div>
              <span className="moc-client">{clientMap[o.client_id]?.name || '—'}</span>
            </div>
            {userRole !== 'operator' && (
              <span className={`status-badge ${o.is_paid ? 'paid' : 'unpaid'}`} onClick={(e) => { e.stopPropagation(); onTogglePaid(o); }}>
                {o.is_paid ? 'Pagada' : 'Pendiente'}
              </span>
            )}
          </div>
          <div className="moc-details">
            <div className="moc-detail">
              <span className="moc-label">Fecha</span>
              <span>{formatDateShort(o.created_at)}</span>
            </div>
            <div className="moc-detail">
              <span className="moc-label">Cantidad</span>
              <span>{o.meters} {unitLabel(o.service as ServiceType)}</span>
            </div>
            {userRole !== 'operator' && (
              <div className="moc-detail">
                <span className="moc-label">Total</span>
                <span className="moc-total">{formatCLP(o.total_amount)}</span>
              </div>
            )}
          </div>
          {o.description && <div className="moc-desc">{o.description}</div>}
        </div>
      ))}
      {!loading && orders.length === 0 && (
        <div className="moc-empty">Sin órdenes</div>
      )}
    </div>
  );
}
