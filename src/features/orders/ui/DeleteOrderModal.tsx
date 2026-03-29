import type { Order } from '../model/types';
import type { Client } from '../../clients/model/types';
import type { ServiceType } from '../../../shared/types';
import { unitLabel } from '../../../shared/types';
import { formatCLP } from '../../../shared/lib/format';

interface DeleteOrderModalProps {
  order: Order;
  clientMap: Record<string, Client>;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

export default function DeleteOrderModal({ order, clientMap, onConfirm, onCancel, deleting }: DeleteOrderModalProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cm-header">
          <h3>Eliminar orden</h3>
          <button className="eom-close" onClick={onCancel}>✕</button>
        </div>
        <div className="cm-body">
          <p className="cm-desc">
            ¿Estás seguro de que quieres eliminar la orden <strong>#{order.id}</strong>?
          </p>
          <div className="cm-clients">
            <div className="cm-client-group">
              <div className="cm-client-name">{clientMap[order.client_id]?.name || `#${order.client_id}`}</div>
              <div className="cm-order-row">
                <span className="cm-order-id">#{order.id}</span>
                <span className="cm-order-service">{order.service}</span>
                <span className="cm-order-meters">{order.meters} {unitLabel(order.service as ServiceType)}</span>
                <span className="cm-order-total">{formatCLP(order.total_amount)}</span>
              </div>
            </div>
          </div>
          <div className="delete-warning">Esta acción no se puede deshacer.</div>
        </div>
        <div className="cm-actions">
          <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn-delete-confirm" onClick={onConfirm} disabled={deleting}>
            {deleting ? '⏳ Eliminando...' : '🗑 Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
