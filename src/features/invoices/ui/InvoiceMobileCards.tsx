import type { Invoice, InvoiceStatus } from '../model/types';
import type { Client } from '../../clients/model/types';
import { formatCLP } from '../../../shared/lib/format';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: 'Pendiente', emitted: 'Emitida', accepted: 'Aceptada', rejected: 'Rechazada', error: 'Error',
};

interface Props {
  invoices: Invoice[];
  clientMap: Record<string, Client>;
  loading: boolean;
  resendingId: number | null;
  loadingPdfId: number | null;
  onCardClick: (inv: Invoice) => void;
  onResend: (id: number, e?: React.MouseEvent) => void;
  onViewPdf: (id: number, e?: React.MouseEvent) => void;
}

function formatFecha(f: string | null) { return f || '—'; }

export default function InvoiceMobileCards({ invoices, clientMap, loading, resendingId, loadingPdfId, onCardClick, onResend, onViewPdf }: Props) {
  return (
    <div className="fi-mobile-cards">
      {loading && Array.from({ length: 4 }).map((_, i) => (
        <div key={`mskel-${i}`} className="fi-mcard fi-mcard-skel" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="fi-mcard-top"><span className="fi-skel" style={{ width: '40%' }} /><span className="fi-skel" style={{ width: '50px' }} /></div>
          <div className="fi-mcard-mid"><span className="fi-skel" style={{ width: '60%' }} /><span className="fi-skel" style={{ width: '30%' }} /></div>
          <div className="fi-mcard-bot"><span className="fi-skel" style={{ width: '45%' }} /></div>
        </div>
      ))}
      {!loading && invoices.map((inv, idx) => (
        <div key={inv.id} className={`fi-mcard fade-in-row ${inv.status === 'error' || inv.status === 'rejected' ? 'fi-mcard-failed' : ''}`} style={{ animationDelay: `${idx * 0.03}s` }} onClick={() => onCardClick(inv)}>
          <div className="fi-mcard-top">
            <span className="fi-mcard-folio">{inv.folio ? `#${inv.folio}` : 'Sin folio'}</span>
            <span className="fi-dte-badge">FE {inv.tipo_dte}</span>
            <span className={`fi-status fi-status-${inv.status}`}>{STATUS_LABELS[inv.status]}</span>
          </div>
          <div className="fi-mcard-mid">
            <span className="fi-mcard-client">{clientMap[String(inv.client_id)]?.name || `#${inv.client_id}`}</span>
            <span className="fi-mcard-date">{formatFecha(inv.fecha_emision)}</span>
          </div>
          <div className="fi-mcard-bot">
            <div className="fi-mcard-amounts">
              <span className="fi-mcard-total">{formatCLP(inv.monto_total)}</span>
              <span className="fi-mcard-meta">{inv.order_ids.length} orden{inv.order_ids.length !== 1 ? 'es' : ''}</span>
            </div>
            <div className="fi-mcard-actions">
              {inv.status === 'emitted' && (
                <button className="fi-pdf-btn" onClick={(e) => onViewPdf(inv.id, e)} disabled={loadingPdfId === inv.id} title="Ver PDF">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </button>
              )}
              {(inv.status === 'error' || inv.status === 'rejected') && (
                <button className="fi-retry-btn" onClick={(e) => onResend(inv.id, e)} disabled={resendingId === inv.id} title="Reintentar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={resendingId === inv.id ? 'fi-spin' : ''}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      {!loading && invoices.length === 0 && (<div className="fi-mcard-empty">Sin documentos que mostrar</div>)}
    </div>
  );
}
