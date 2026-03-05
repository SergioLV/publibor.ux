import { useState, useEffect, useMemo } from 'react';
import { fetchClients, fetchInvoices } from '../data/api';
import { formatCLP } from '../data/format';
import type { Invoice, InvoiceStatus, Client } from '../data/types';
import './Facturacion.css';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: 'Pendiente',
  emitted: 'Emitida',
  failed: 'Error',
};

export default function Facturacion() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchClients({ limit: 100 }).then((res) => setClients(res.clients)).catch(() => {});
  }, []);

  useEffect(() => { loadInvoices(); }, []);

  async function loadInvoices() {
    setLoading(true);
    try {
      const data = await fetchInvoices();
      setInvoices(data.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando facturas');
    } finally {
      setLoading(false);
    }
  }

  const clientMap = useMemo(() => {
    const m: Record<string, Client> = {};
    clients.forEach((c) => (m[c.id] = c));
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => !filterStatus || inv.status === filterStatus);
  }, [invoices, filterStatus]);

  const totals = useMemo(() => {
    const emitted = invoices.filter((i) => i.status === 'emitted');
    const pending = invoices.filter((i) => i.status === 'pending');
    const failed = invoices.filter((i) => i.status === 'failed');
    return {
      emitted: emitted.length,
      emittedTotal: emitted.reduce((s, i) => s + i.monto_total, 0),
      pending: pending.length,
      pendingTotal: pending.reduce((s, i) => s + i.monto_total, 0),
      failed: failed.length,
      total: invoices.length,
      grandTotal: invoices.reduce((s, i) => s + i.monto_total, 0),
    };
  }, [invoices]);

  function formatFecha(fecha: string | null): string {
    if (!fecha) return '—';
    return fecha;
  }

  if (!loading && invoices.length === 0 && !error) {
    return (
      <div className="fi-page">
        <div className="fi-empty">
          <div className="fi-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <h3>Sin documentos tributarios</h3>
          <p>Selecciona órdenes desde la vista de Órdenes y haz click en "Facturar" para emitir tu primera factura electrónica.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fi-page">
      {error && <div className="fi-toast fi-toast-error">{error}</div>}

      {/* KPI Cards */}
      <div className="fi-kpis">
        <div className="fi-kpi">
          <div className="fi-kpi-accent fi-kpi-accent-total" />
          <div className="fi-kpi-body">
            <span className="fi-kpi-label">Total facturado</span>
            <span className="fi-kpi-amount">{formatCLP(totals.grandTotal)}</span>
            <span className="fi-kpi-meta">{totals.total} documento{totals.total !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="fi-kpi">
          <div className="fi-kpi-accent fi-kpi-accent-emitted" />
          <div className="fi-kpi-body">
            <span className="fi-kpi-label">Emitidas</span>
            <span className="fi-kpi-value">{totals.emitted}</span>
            <span className="fi-kpi-meta">{formatCLP(totals.emittedTotal)}</span>
          </div>
        </div>
        <div className="fi-kpi">
          <div className="fi-kpi-accent fi-kpi-accent-pending" />
          <div className="fi-kpi-body">
            <span className="fi-kpi-label">Pendientes</span>
            <span className="fi-kpi-value">{totals.pending}</span>
            <span className="fi-kpi-meta">{formatCLP(totals.pendingTotal)}</span>
          </div>
        </div>
        {totals.failed > 0 && (
          <div className="fi-kpi">
            <div className="fi-kpi-accent fi-kpi-accent-failed" />
            <div className="fi-kpi-body">
              <span className="fi-kpi-label">Con error</span>
              <span className="fi-kpi-value">{totals.failed}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="fi-controls">
        <div className="fi-filter-group">
          <button className={`fi-filter-chip ${filterStatus === '' ? 'active' : ''}`} onClick={() => setFilterStatus('')}>Todos</button>
          <button className={`fi-filter-chip ${filterStatus === 'emitted' ? 'active' : ''}`} onClick={() => setFilterStatus('emitted')}>
            <span className="fi-chip-dot fi-dot-emitted" />Emitidas
          </button>
          <button className={`fi-filter-chip ${filterStatus === 'pending' ? 'active' : ''}`} onClick={() => setFilterStatus('pending')}>
            <span className="fi-chip-dot fi-dot-pending" />Pendientes
          </button>
          <button className={`fi-filter-chip ${filterStatus === 'failed' ? 'active' : ''}`} onClick={() => setFilterStatus('failed')}>
            <span className="fi-chip-dot fi-dot-failed" />Error
          </button>
        </div>
        <div className="fi-controls-right">
          <span className="fi-result-count">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          <button className="fi-refresh-btn" onClick={loadInvoices} disabled={loading}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'fi-spin' : ''}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Invoice table */}
      <div className="fi-table-card">
        <div className="fi-table-wrap">
          <table className="fi-table">
            <thead>
              <tr>
                <th className="fi-th-folio">Folio</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th className="fi-th-center">Órdenes</th>
                <th className="fi-th-right">Neto</th>
                <th className="fi-th-right">IVA</th>
                <th className="fi-th-right fi-th-total">Total</th>
                <th className="fi-th-center">Estado</th>
                <th className="fi-th-action"></th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skel-${i}`} className="fi-skel-row">
                  {Array.from({ length: 10 }).map((__, j) => (
                    <td key={j}><span className="fi-skel" /></td>
                  ))}
                </tr>
              ))}
              {!loading && filtered.map((inv) => (
                <tr key={inv.id} className={`fi-row ${inv.status === 'failed' ? 'fi-row-failed' : ''}`} onClick={() => setDetailInvoice(inv)}>
                  <td className="fi-cell-folio">{inv.folio ? `#${inv.folio}` : '—'}</td>
                  <td><span className="fi-dte-badge">FE {inv.tipo_dte}</span></td>
                  <td className="fi-cell-date">{formatFecha(inv.fecha_emision)}</td>
                  <td className="fi-cell-client">{clientMap[String(inv.client_id)]?.name || `#${inv.client_id}`}</td>
                  <td className="fi-cell-center fi-cell-orders">{inv.order_ids.length}</td>
                  <td className="fi-cell-right fi-cell-money">{formatCLP(inv.monto_neto)}</td>
                  <td className="fi-cell-right fi-cell-money fi-cell-iva">{formatCLP(inv.iva)}</td>
                  <td className="fi-cell-right fi-cell-money fi-cell-total">{formatCLP(inv.monto_total)}</td>
                  <td className="fi-cell-center">
                    <span className={`fi-status fi-status-${inv.status}`}>{STATUS_LABELS[inv.status]}</span>
                  </td>
                  <td className="fi-cell-action">
                    <button className="fi-view-btn" onClick={(e) => { e.stopPropagation(); setDetailInvoice(inv); }} title="Ver detalle">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={10} className="fi-empty-row">Sin documentos que mostrar</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail slide-over */}
      {detailInvoice && (
        <div className="fi-overlay" onClick={() => setDetailInvoice(null)}>
          <div className="fi-detail" onClick={(e) => e.stopPropagation()}>
            <div className="fi-detail-header">
              <div className="fi-detail-header-left">
                <img src="/images/sii.png" alt="SII" className="fi-sii-logo" />
                <div>
                  <span className="fi-detail-type">Factura Electrónica</span>
                  <h2 className="fi-detail-folio">{detailInvoice.folio ? `Folio #${detailInvoice.folio}` : 'Sin folio'}</h2>
                </div>
              </div>
              <button className="fi-detail-close" onClick={() => setDetailInvoice(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="fi-detail-status-bar">
              <span className={`fi-status fi-status-${detailInvoice.status}`}>{STATUS_LABELS[detailInvoice.status]}</span>
              {detailInvoice.fecha_emision && <span className="fi-detail-date">{detailInvoice.fecha_emision}</span>}
            </div>

            <div className="fi-detail-section">
              <h4 className="fi-detail-section-title">Información</h4>
              <div className="fi-detail-grid">
                <div className="fi-detail-field">
                  <span className="fi-detail-label">Cliente</span>
                  <span className="fi-detail-value">{clientMap[String(detailInvoice.client_id)]?.name || `#${detailInvoice.client_id}`}</span>
                </div>
                <div className="fi-detail-field">
                  <span className="fi-detail-label">RUT</span>
                  <span className="fi-detail-value">{clientMap[String(detailInvoice.client_id)]?.rut || '—'}</span>
                </div>
                <div className="fi-detail-field">
                  <span className="fi-detail-label">Tipo DTE</span>
                  <span className="fi-detail-value">{detailInvoice.tipo_dte}</span>
                </div>
                <div className="fi-detail-field">
                  <span className="fi-detail-label">Órdenes</span>
                  <span className="fi-detail-value fi-detail-orders">{detailInvoice.order_ids.map((id) => `#${id}`).join(', ')}</span>
                </div>
              </div>
            </div>

            {detailInvoice.error_message && (
              <div className="fi-detail-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span>{detailInvoice.error_message}</span>
              </div>
            )}

            <div className="fi-detail-totals">
              <div className="fi-detail-total-row">
                <span>Neto</span>
                <span>{formatCLP(detailInvoice.monto_neto)}</span>
              </div>
              <div className="fi-detail-total-row">
                <span>IVA 19%</span>
                <span>{formatCLP(detailInvoice.iva)}</span>
              </div>
              <div className="fi-detail-total-row fi-detail-grand">
                <span>Total</span>
                <span>{formatCLP(detailInvoice.monto_total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
