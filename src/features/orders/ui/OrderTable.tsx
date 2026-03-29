import type { Order } from '../model/types';
import type { Client } from '../../clients/model/types';
import type { ServiceType } from '../../../shared/types';
import { unitLabel, serviceLabel } from '../../../shared/types';
import { formatCLP, formatDate, formatDateShort } from '../../../shared/lib/format';
import { getCotizacionPdf } from '../api/orders-api';

interface OrderTableProps {
  orders: Order[];
  loading: boolean;
  selected: Set<string>;
  clientMap: Record<string, Client>;
  userRole?: string;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenEdit: (order: Order) => void;
  onTogglePaid: (order: Order) => void;
  onSetDeleteOrder: (order: Order) => void;
}

export default function OrderTable({
  orders, loading, selected, clientMap, userRole,
  onToggleSelect, onToggleSelectAll, onOpenEdit, onTogglePaid, onSetDeleteOrder,
}: OrderTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="th-check">
              <input type="checkbox" checked={orders.length > 0 && orders.every((o) => selected.has(o.id))} onChange={onToggleSelectAll} />
            </th>
            <th>#</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Servicio</th>
            <th>Descripción</th>
            <th>Cantidad</th>
            {userRole !== 'operator' && <th>Precio Unit.</th>}
            {userRole !== 'operator' && <th>Total</th>}
            {userRole !== 'operator' && <th>Estado</th>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: 8 }).map((_, i) => (
            <tr key={`skel-${i}`} className="skeleton-row" style={{ animationDelay: `${i * 0.04}s` }}>
              <td><span className="skeleton-cell tiny" /></td>
              <td><span className="skeleton-cell tiny" /></td>
              <td><span className="skeleton-cell medium" /></td>
              <td><span className="skeleton-cell wide" /></td>
              <td><span className="skeleton-cell medium" /></td>
              <td><span className="skeleton-cell short" /></td>
              <td><span className="skeleton-cell short" /></td>
              <td><span className="skeleton-cell short" /></td>
              <td><span className="skeleton-cell tiny" /></td>
              <td><span className="skeleton-cell tiny" /></td>
            </tr>
          ))}
          {!loading && orders.map((o, idx) => (
            <tr key={o.id} className={`fade-in-row ${selected.has(o.id) ? 'row-selected' : ''} ${!o.is_paid ? 'row-clickable' : ''}`} style={{ animationDelay: `${idx * 0.02}s` }} onClick={() => !o.is_paid && onOpenEdit(o)}>
              <td onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={selected.has(o.id)} onChange={() => onToggleSelect(o.id)} />
              </td>
              <td className="order-id-cell">
                #{o.id}
                {userRole !== 'operator' && o.invoice_id && <span className="invoice-badge">Facturada</span>}
              </td>
              <td title={formatDate(o.created_at)}>{formatDateShort(o.created_at)}</td>
              <td>{clientMap[o.client_id]?.name || '—'}</td>
              <td><span className={`service-pill ${o.service.toLowerCase()}`}>{serviceLabel(o.service)}</span></td>
              <td className="desc-cell">{o.description || '—'}</td>
              <td>{o.meters} {unitLabel(o.service as ServiceType)}</td>
              {userRole !== 'operator' && <td>{formatCLP(o.unit_price)}</td>}
              {userRole !== 'operator' && <td>{formatCLP(o.total_amount)}</td>}
              {userRole !== 'operator' && (
              <td onClick={(e) => e.stopPropagation()}>
                <span className={`status-badge ${o.is_paid ? 'paid' : 'unpaid'}`} onClick={() => onTogglePaid(o)} title={o.is_paid ? 'Click para desmarcar pago' : 'Click para marcar como pagada'}>
                  {o.is_paid ? 'Pagada' : 'Pendiente'}
                </span>
              </td>
              )}
              <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                {!o.is_paid && (
                  <button className="btn-action" onClick={() => onOpenEdit(o)} title="Editar orden">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                )}
                {userRole !== 'operator' && (
                <button className="btn-action" onClick={async (e) => { e.stopPropagation(); try { await getCotizacionPdf(o.id); } catch { /* silent */ } }} title="Descargar cotización">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </button>
                )}
                {userRole !== 'operator' && !o.is_paid && !o.invoice_id && (
                  <button className="btn-action btn-action-delete" onClick={() => onSetDeleteOrder(o)} title="Eliminar orden">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!loading && orders.length === 0 && (
            <tr><td colSpan={11} style={{ textAlign: 'center' }}>Sin órdenes</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
