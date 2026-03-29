import type { Order } from '../model/types';
import type { ServiceType } from '../../../shared/types';
import { unitLabel } from '../../../shared/types';
import { formatCLP } from '../../../shared/lib/format';

interface MarkPaidSummary {
  byClient: Record<string, { name: string; orders: Order[] }>;
  grandTotal: number;
  count: number;
}

interface MarkPaidModalProps {
  markPaidSummary: MarkPaidSummary;
  onConfirm: () => void;
  onCancel: () => void;
  markingPaid: boolean;
}

export default function MarkPaidModal({ markPaidSummary, onConfirm, onCancel, markingPaid }: MarkPaidModalProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cm-header">
          <h3>Confirmar pago</h3>
          <button className="eom-close" onClick={onCancel}>✕</button>
        </div>
        <div className="cm-body">
          <p className="cm-desc">
            Vas a marcar <strong>{markPaidSummary.count} orden{markPaidSummary.count > 1 ? 'es' : ''}</strong> como pagada{markPaidSummary.count > 1 ? 's' : ''}:
          </p>
          <div className="cm-clients">
            {Object.entries(markPaidSummary.byClient).map(([cid, data]) => (
              <div key={cid} className="cm-client-group">
                <div className="cm-client-name">{data.name}</div>
                {data.orders.map((o) => (
                  <div key={o.id} className="cm-order-row">
                    <span className="cm-order-id">#{o.id}</span>
                    <span className="cm-order-service">{o.service}</span>
                    <span className="cm-order-meters">{o.meters} {unitLabel(o.service as ServiceType)}</span>
                    <span className="cm-order-total">{formatCLP(o.total_amount)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="cm-grand-total">
            <span>Total</span>
            <span>{formatCLP(markPaidSummary.grandTotal)}</span>
          </div>
        </div>
        <div className="cm-actions">
          <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn-mark-paid" onClick={onConfirm} disabled={markingPaid}>
            {markingPaid ? '⏳ Marcando...' : '✓ Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}
