import type { Invoice, InvoiceStatus } from '../model/types';
import type { Client } from '../../clients/model/types';
import { formatCLP } from '../../../shared/lib/format';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: 'Pendiente', emitted: 'Emitida', accepted: 'Aceptada', rejected: 'Rechazada', error: 'Error',
};

interface Props {
  invoice: Invoice;
  clientMap: Record<string, Client>;
  resendingId: number | null;
  loadingPdfId: number | null;
  onClose: () => void;
  onResend: (id: number) => void;
  onViewPdf: (id: number) => void;
}

export default function InvoiceDetailPanel({ invoice: inv, clientMap, resendingId, loadingPdfId, onClose, onResend, onViewPdf }: Props) {
  const client = clientMap[String(inv.client_id)];
  return (
    <div className="fi-overlay" onClick={onClose}>
      <div className="fi-detail" onClick={(e) => e.stopPropagation()}>
        <div className="fi-detail-header">
          <div className="fi-detail-header-left">
            <img src="/images/sii.png" alt="SII" className="fi-sii-logo" />
            <div>
              <span className="fi-detail-type">Factura Electrónica</span>
              <h2 className="fi-detail-folio">{inv.folio ? `Folio #${inv.folio}` : 'Sin folio'}</h2>
            </div>
          </div>
          <button className="fi-detail-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="fi-detail-status-bar">
          <span className={`fi-status fi-status-${inv.status}`}>{STATUS_LABELS[inv.status]}</span>
          {inv.fecha_emision && <span className="fi-detail-date">{inv.fecha_emision}</span>}
        </div>

        <div className="fi-detail-section">
          <h4 className="fi-detail-section-title">Información</h4>
          <div className="fi-detail-grid">
            <div className="fi-detail-field"><span className="fi-detail-label">Cliente</span><span className="fi-detail-value">{client?.name || `#${inv.client_id}`}</span></div>
            <div className="fi-detail-field"><span className="fi-detail-label">RUT</span><span className="fi-detail-value">{client?.rut || '—'}</span></div>
            <div className="fi-detail-field"><span className="fi-detail-label">Tipo DTE</span><span className="fi-detail-value">{inv.tipo_dte}</span></div>
            <div className="fi-detail-field"><span className="fi-detail-label">Órdenes</span><span className="fi-detail-value fi-detail-orders">{inv.order_ids.map((id) => `#${id}`).join(', ')}</span></div>
          </div>
        </div>

        {inv.error_message && (
          <div className="fi-detail-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <span>{inv.error_message}</span>
          </div>
        )}

        <div className="fi-detail-actions">
          {inv.status === 'emitted' && (
            <button className="fi-detail-pdf-btn" onClick={() => onViewPdf(inv.id)} disabled={loadingPdfId === inv.id}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {loadingPdfId === inv.id ? 'Cargando PDF...' : 'Ver PDF'}
            </button>
          )}
          {(inv.status === 'error' || inv.status === 'rejected') && (
            <button className="fi-resend-btn" onClick={() => onResend(inv.id)} disabled={resendingId === inv.id}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={resendingId === inv.id ? 'fi-spin' : ''}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              {resendingId === inv.id ? 'Reenviando...' : 'Reintentar envío al SII'}
            </button>
          )}
        </div>

        <div className="fi-detail-totals">
          <div className="fi-detail-total-row"><span>Neto</span><span>{formatCLP(inv.monto_neto)}</span></div>
          <div className="fi-detail-total-row"><span>IVA 19%</span><span>{formatCLP(inv.iva)}</span></div>
          <div className="fi-detail-total-row fi-detail-grand"><span>Total</span><span>{formatCLP(inv.monto_total)}</span></div>
        </div>
      </div>
    </div>
  );
}
