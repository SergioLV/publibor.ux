import type { ServiceType } from '../../../shared/types';
import { unitLabel } from '../../../shared/types';
import { formatCLP, formatDate } from '../../../shared/lib/format';
import type { Client } from '../../clients/model/types';
import type { Order, PurchaseOrder } from '../model/types';

interface Calc { unitPrice: number; subtotal: number; tax_amount: number; total_amount: number }

interface Props {
  selectedClient: Client | null;
  service: ServiceType | '';
  quantity: string;
  description: string;
  bultos: string;
  purchaseOrders: PurchaseOrder[];
  images: string[];
  calc: Calc | null;
  isManualOnly: boolean;
  isManualOverride: boolean;
  priceError: string;
  totalChanged: boolean;
  submitting: boolean;
  generatingPdf: boolean;
  recentOrders: Order[];
  userRole?: string;
  onSubmit: () => void;
  onCotizacion: () => void;
}

export default function OrderSummary(p: Props) {
  const unit = p.service ? unitLabel(p.service as ServiceType) : 'mts';
  return (
    <aside className="no-sidebar">
      <div className={`side-summary ${p.calc ? 'side-ready' : ''}`}>
        <div className="side-summary-head">Resumen de orden</div>
        <div className="side-rows">
          <div className="side-row"><span className="side-row-label">Cliente</span><span className="side-row-value">{p.selectedClient?.name ?? '—'}</span></div>
          <div className="side-row"><span className="side-row-label">Servicio</span><span className="side-row-value">{p.service || '—'}</span></div>
          <div className="side-row"><span className="side-row-label">Cantidad</span><span className="side-row-value">{p.quantity ? `${p.quantity} ${unit}` : '—'}</span></div>
          {p.description && <div className="side-row"><span className="side-row-label">Descripción</span><span className="side-row-value side-row-desc">{p.description}</span></div>}
          {p.bultos && Number(p.bultos) > 0 && <div className="side-row"><span className="side-row-label">Bultos</span><span className="side-row-value">{p.bultos}</span></div>}
          {p.purchaseOrders.length > 0 && <div className="side-row"><span className="side-row-label">OC</span><span className="side-row-value">{p.purchaseOrders.filter(po => po.oc_number).length} orden{p.purchaseOrders.filter(po => po.oc_number).length !== 1 ? 'es' : ''}</span></div>}
          {p.images.length > 0 && <div className="side-row"><span className="side-row-label">Imágenes</span><span className="side-row-value">{p.images.length}</span></div>}
        </div>
        <div className="side-divider" />
        {p.userRole !== 'operator' && (
          <>
            <div className="side-rows">
              <div className="side-row"><span className="side-row-label">Precio{p.isManualOnly || p.isManualOverride ? ' (manual)' : ''}</span><span className="side-row-value">{p.calc ? formatCLP(p.calc.unitPrice) + '/' + unit : '—'}</span></div>
              <div className="side-row"><span className="side-row-label">Subtotal</span><span className="side-row-value">{p.calc ? formatCLP(p.calc.subtotal) : '—'}</span></div>
              <div className="side-row"><span className="side-row-label">IVA 19%</span><span className="side-row-value">{p.calc ? formatCLP(p.calc.tax_amount) : '—'}</span></div>
            </div>
            <div className="side-divider" />
            <div className="side-total-row">
              <span className="side-total-label">Total</span>
              <span className={`side-total-amount ${p.totalChanged ? 'pulse' : ''}`} key={p.calc?.total_amount}>{p.calc ? formatCLP(p.calc.total_amount) : '$0'}</span>
            </div>
          </>
        )}
        <div className="side-actions">
          <button className="btn-submit side-btn" onClick={p.onSubmit} disabled={!p.quantity || Number(p.quantity) < 0.1 || (p.userRole !== 'operator' && !!p.priceError) || p.submitting}>{p.submitting ? 'Creando...' : 'Crear Orden'}</button>
          {p.userRole !== 'operator' && <button className="btn-cotizacion side-btn" onClick={p.onCotizacion} disabled={!p.calc || !!p.priceError || p.generatingPdf}>{p.generatingPdf ? 'Generando...' : 'Cotización PDF'}</button>}
        </div>
      </div>
      {p.selectedClient && p.recentOrders.length > 0 && (
        <div className="side-recent">
          <div className="side-recent-head">Últimas órdenes</div>
          <div className="recent-rows">
            {p.recentOrders.map((o) => (
              <div key={o.id} className="recent-row">
                <span>{formatDate(o.created_at)}</span><span className="recent-service">{o.service}</span>
                <span>{o.meters}{unitLabel(o.service)}</span><span className="recent-total">{formatCLP(o.total_amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
