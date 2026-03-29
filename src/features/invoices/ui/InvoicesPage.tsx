import { useState, useEffect, useMemo } from 'react';
import { useClients } from '../../clients';
import type { Client } from '../../clients';
import { useInvoices, useResendInvoice, useInvoicePdf } from '../api/hooks';
import type { Invoice, InvoiceStatus } from '../model/types';
import InvoiceKPIs from './InvoiceKPIs';
import InvoiceFilters from './InvoiceFilters';
import InvoiceTable from './InvoiceTable';
import InvoiceMobileCards from './InvoiceMobileCards';
import InvoiceDetailPanel from './InvoiceDetailPanel';
import './Facturacion.css';

export default function InvoicesPage() {
  const { data: invoicesRaw = [], isLoading: loading, refetch } = useInvoices();
  const { data: clientsData } = useClients({ limit: 100 });
  const resendMut = useResendInvoice();
  const pdfMut = useInvoicePdf();

  const invoices = useMemo(() => [...invoicesRaw].sort((a, b) => b.created_at.localeCompare(a.created_at)), [invoicesRaw]);
  const clients: Client[] = clientsData?.clients ?? [];

  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | ''>('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && detailInvoice) { setDetailInvoice(null); e.stopImmediatePropagation(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [detailInvoice]);

  const resendingId = resendMut.isPending ? (resendMut.variables ?? null) : null;
  const loadingPdfId = pdfMut.isPending ? (pdfMut.variables ?? null) : null;

  const clientMap = useMemo(() => {
    const m: Record<string, Client> = {};
    clients.forEach((c) => (m[c.id] = c));
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (!filterStatus) return true;
      if (filterStatus === 'error') return inv.status === 'error' || inv.status === 'rejected';
      return inv.status === filterStatus;
    });
  }, [invoices, filterStatus]);

  const totals = useMemo(() => {
    const emitted = invoices.filter((i) => i.status === 'emitted');
    const pending = invoices.filter((i) => i.status === 'pending');
    const failed = invoices.filter((i) => i.status === 'error' || i.status === 'rejected');
    return {
      emitted: emitted.length, emittedTotal: emitted.reduce((s, i) => s + i.monto_total, 0),
      pending: pending.length, pendingTotal: pending.reduce((s, i) => s + i.monto_total, 0),
      failed: failed.length, total: invoices.length,
      grandTotal: invoices.reduce((s, i) => s + i.monto_total, 0),
    };
  }, [invoices]);

  function handleResend(id: number, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setError('');
    resendMut.mutate(id, {
      onSuccess: () => { setFeedback(`Factura #${id} reenviada al SII`); setTimeout(() => setFeedback(''), 4000); setDetailInvoice(null); refetch(); },
      onError: (err) => { setError(err instanceof Error ? err.message : 'Error reenviando factura'); setTimeout(() => setError(''), 5000); },
    });
  }

  function handleViewPdf(id: number, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    pdfMut.mutate(id, {
      onSuccess: (url) => { window.open(url); },
      onError: (err) => { setError(err instanceof Error ? err.message : 'Error obteniendo PDF'); setTimeout(() => setError(''), 5000); },
    });
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
      {feedback && <div className="fi-toast fi-toast-success">{feedback}</div>}

      <InvoiceKPIs {...totals} />
      <InvoiceFilters filterStatus={filterStatus} onFilterChange={setFilterStatus} resultCount={filtered.length} loading={loading} onRefresh={() => refetch()} />
      <InvoiceTable invoices={filtered} clientMap={clientMap} loading={loading} resendingId={resendingId} loadingPdfId={loadingPdfId} onRowClick={setDetailInvoice} onResend={handleResend} onViewPdf={handleViewPdf} />
      <InvoiceMobileCards invoices={filtered} clientMap={clientMap} loading={loading} resendingId={resendingId} loadingPdfId={loadingPdfId} onCardClick={setDetailInvoice} onResend={handleResend} onViewPdf={handleViewPdf} />

      {detailInvoice && (
        <InvoiceDetailPanel invoice={detailInvoice} clientMap={clientMap} resendingId={resendingId} loadingPdfId={loadingPdfId} onClose={() => setDetailInvoice(null)} onResend={handleResend} onViewPdf={handleViewPdf} />
      )}
    </div>
  );
}
