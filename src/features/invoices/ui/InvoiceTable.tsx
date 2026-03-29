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
  onRowClick: (inv: Invoice) => void;
  onResend: (id: number, e?: React.MouseEvent) => void;
  onViewPdf: (id: number, e?: React.MouseEvent) => void;
}

function formatFecha(f: string | null) { return f || '—'; }

export default function InvoiceTable({ invoices, clientMap, loading, resendingId, loadingPdfId, onRowClick, onResend, onViewPdf }: Props) {
  return (
    <div className="fi-table-card">
      <div className="fi-table-wrap">
        <table className="fi-table">
          <thead>
            <tr>
              <th className="fi-th-folio">Folio</th><th>Tipo</th><th>Fecha</th><th>Cliente</th>
              <th className="fi-th-center">Órdenes</th><th className="fi-th-right">Neto</th>
              <th className="fi-th-right">IVA</th><th className="fi-th-right fi-th-total">Total</th>
              <th className="fi-th-center">Estado</th><th className="fi-th-action"></th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={`skel-${i}`} className="fi-skel-row" style={{ animationDelay: `${i * 0.04}s` }}>
                {Array.from({ length: 10 }).map((__, j) => (<td key={j}><span className="fi-skel" /></td>))}
              </tr>
            ))}
            {!loading && invoices.map((inv, idx) => (
              <tr key={inv.id} className={`fi-row fade-in-row ${inv.status === 'error' || inv.status === 'rejected' ? 'fi-row-failed' : ''}`} style={{ animationDelay: `${idx * 0.02}s` }} onClick={() => onRowClick(inv)}>
                <td className="fi-cell-folio">{inv.folio ? `#${inv.folio}` : '—'}</td>
                <td><span className="fi-dte-badge">FE {inv.tipo_dte}</span></td>
                <td className="fi-cell-date">{formatFecha(inv.fecha_emision)}</td>
                <td className="fi-cell-client">{clientMap[String(inv.client_id)]?.name || `#${inv.client_id}`}</td>
                <td className="fi-cell-center fi-cell-orders">{inv.order_ids.length}</td>
                <td className="fi-cell-right fi-cell-money">{formatCLP(inv.monto_neto)}</td>
                <td className="fi-cell-right fi-cell-money fi-cell-iva">{formatCLP(inv.iva)}</td>
                <td className="fi-cell-right fi-cell-money fi-cell-total">{formatCLP(inv.monto_total)}</td>
                <td className="fi-cell-center"><span className={`fi-status fi-status-${inv.status}`}>{STATUS_LABELS[inv.status]}</span></td>
                <td className="fi-cell-action">
                  {inv.status === 'emitted' && (
                    <button className="fi-pdf-btn" onClick={(e) => onViewPdf(inv.id, e)} disabled={loadingPdfId === inv.id} title="Ver PDF">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </button>
                  )}
                  {(inv.status === 'error' || inv.status === 'rejected') && (
                    <button className="fi-retry-btn" onClick={(e) => onResend(inv.id, e)} disabled={resendingId === inv.id} title="Reintentar envío">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={resendingId === inv.id ? 'fi-spin' : ''}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    </button>
                  )}
                  <button className="fi-view-btn" onClick={(e) => { e.stopPropagation(); onRowClick(inv); }} title="Ver detalle">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </button>
                </td>
              </tr>
            ))}
            {!loading && invoices.length === 0 && (<tr><td colSpan={10} className="fi-empty-row">Sin documentos que mostrar</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
