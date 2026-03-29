import { useState, useMemo, useEffect, useCallback } from 'react';
import { fetchClients, fetchClientById } from '../../clients/api/clients-api';
import { fetchOrders, apiUpdateOrder, apiDeleteOrder, apiBulkMarkPaid, openBulkCotizacion, downloadExcelExport } from '../api/orders-api';
import { apiPreviewInvoice, apiCreateInvoice } from '../../invoices/api/invoices-api';
import { fetchDefaultPrices } from '../../prices/api/prices-api';
import type { PhotoPayload } from '../model/types';
import type { Order } from '../model/types';
import type { Client } from '../../clients/model/types';
import type { PriceTier } from '../../prices/model/types';
import { formatCLP } from '../../../shared/lib/format';
import { getEffectivePrice, calculateOrder } from '../../../shared/lib/pricing';
import OrderFilters from './OrderFilters';
import OrderTable from './OrderTable';
import OrderMobileCards from './OrderMobileCards';
import OrderEditPanel from './OrderEditPanel';
import type { EditingOrder } from './OrderEditPanel';
import OrderSelectionBar from './OrderSelectionBar';
import MarkPaidModal from './MarkPaidModal';
import FacturarModal from './FacturarModal';
import DeleteOrderModal from './DeleteOrderModal';
import './OrderList.css';

const PAGE_SIZES = [10, 25, 50, 100];

export default function OrderListPage({ onNavigate, userRole }: { onNavigate: (view: string) => void; userRole?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterPayment, setFilterPayment] = useState<'unpaid' | 'paid' | 'all'>('unpaid');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Map<string, Order>>(new Map());
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [showMarkPaidConfirm, setShowMarkPaidConfirm] = useState(false);
  const [singleMarkPaidOrder, setSingleMarkPaidOrder] = useState<Order | null>(null);
  const [generatingBulkPdf, setGeneratingBulkPdf] = useState(false);
  const [showFacturarPreview, setShowFacturarPreview] = useState(false);
  const [facturando, setFacturando] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fmaPago, setFmaPago] = useState<1 | 2>(2);
  const [diasVencimiento, setDiasVencimiento] = useState(30);
  const [editing, setEditing] = useState<EditingOrder | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [loadingEditClient, setLoadingEditClient] = useState(false);
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({ service: false, details: false, price: true, po: true, photos: true });
  const toggleSection = (key: string) => setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    fetchClients({ limit: 100 }).then((res) => setClients(res.clients)).catch(() => {});
    fetchDefaultPrices().then(setTiers).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (deleteOrder) { setDeleteOrder(null); e.stopImmediatePropagation(); return; }
      if (showFacturarPreview) { setShowFacturarPreview(false); setPreviewUrl(null); e.stopImmediatePropagation(); return; }
      if (showMarkPaidConfirm) { setShowMarkPaidConfirm(false); setSingleMarkPaidOrder(null); e.stopImmediatePropagation(); return; }
      if (showClientPicker) { setShowClientPicker(false); e.stopImmediatePropagation(); return; }
      if (editing) { closeEdit(); e.stopImmediatePropagation(); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteOrder, showFacturarPreview, showMarkPaidConfirm, showClientPicker, editing]);

  const clientMap = useMemo(() => {
    const m: Record<string, Client> = {};
    clients.forEach((c) => (m[c.id] = c));
    return m;
  }, [clients]);

  const loadOrders = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetchOrders({ client_id: filterClient || undefined, service: filterService || undefined, is_paid: filterPayment === 'all' ? undefined : filterPayment === 'paid', date_from: filterDateFrom || undefined, date_to: filterDateTo || undefined, page, limit: pageSize });
      setOrders(res.orders); setTotal(res.total); setTotalPages(res.totalPages);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error cargando órdenes'); }
    finally { setLoading(false); }
  }, [filterClient, filterService, filterPayment, filterDateFrom, filterDateTo, page, pageSize]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filterKey = `${filterClient}|${filterService}|${filterPayment}|${filterDateFrom}|${filterDateTo}|${pageSize}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) { setPrevFilterKey(filterKey); if (page !== 1) setPage(1); }

  const pageTotal = orders.reduce((s, o) => s + o.total_amount, 0);

  // --- Edit modal logic ---
  const editHasTiers = useMemo(() => { const services = new Set(tiers.map((t) => t.service)); return editing ? services.has(editing.service) : false; }, [tiers, editing]);

  async function openEdit(order: Order) {
    setEditing({ id: order.id, client_id: order.client_id, service: order.service, description: order.description || '', meters: String(order.meters), priceOverride: '', purchase_orders: order.purchase_orders || [], bultos: order.bultos ? String(order.bultos) : '', photos: order.photos || [], newPhotos: [] });
    setCollapsedSections({ service: false, details: false, price: true, po: true, photos: true });
    setLoadingEditClient(true);
    try { const client = await fetchClientById(order.client_id); setEditClient(client); } catch { setEditClient(null); } finally { setLoadingEditClient(false); }
  }

  function closeEdit() { setEditing(null); setEditClient(null); setLoadingEditClient(false); }

  const editAutoPrice = useMemo(() => {
    if (!editing || !editClient || !editing.service || !editing.meters || Number(editing.meters) < 0.1) return null;
    return getEffectivePrice(editClient, tiers, editing.service, Number(editing.meters));
  }, [editing, editClient, tiers]);

  const editFinalPrice = editing && editing.priceOverride && Number(editing.priceOverride) > 0 ? Number(editing.priceOverride) : editAutoPrice?.price ?? null;
  const editIsManualOverride = editing && editing.priceOverride !== '' && Number(editing.priceOverride) > 0 && editAutoPrice && Number(editing.priceOverride) !== editAutoPrice.price;
  const editIsManualOnly = editing && !editHasTiers;
  const editCalc = useMemo(() => { if (editFinalPrice === null || !editing || !editing.meters || Number(editing.meters) < 0.1) return null; return calculateOrder(editFinalPrice, Number(editing.meters)); }, [editFinalPrice, editing]);

  function handleEditImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editing) return;
    const files = e.target.files; if (!files) return;
    Array.from(files).forEach((file) => { if (!file.type.startsWith('image/')) return; const reader = new FileReader(); reader.onload = () => { setEditing((prev) => prev ? { ...prev, newPhotos: [...prev.newPhotos, reader.result as string] } : prev); }; reader.readAsDataURL(file); });
    e.target.value = '';
  }

  async function handleSaveEdit() {
    if (!editing) return;
    if (userRole !== 'operator' && !editCalc) return;
    setSaving(true); setError('');
    try {
      const newPhotoPayloads: PhotoPayload[] = editing.newPhotos.map((dataUrl, i) => { const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/); if (!match) return { filename: `foto${i + 1}.jpg`, content_type: 'image/jpeg', data: dataUrl }; const ext = match[1].split('/')[1]; return { filename: `foto${i + 1}.${ext}`, content_type: match[1], data: match[2] }; });
      await apiUpdateOrder(editing.id, { service: editing.service, description: editing.description.trim() || undefined, meters: Number(editing.meters), unit_price: (editIsManualOnly || editIsManualOverride) ? Number(editing.priceOverride) : undefined, purchase_orders: editing.purchase_orders.filter(po => po.oc_number.trim()), bultos: editing.bultos && Number(editing.bultos) > 0 ? Number(editing.bultos) : 0, photos: newPhotoPayloads.length > 0 ? newPhotoPayloads : undefined });
      setFeedback(`Orden #${editing.id} actualizada`); setTimeout(() => setFeedback(''), 3000); closeEdit(); await loadOrders();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error actualizando orden'); } finally { setSaving(false); }
  }

  // --- Selection logic ---
  function toggleSelect(id: string) {
    const order = orders.find((o) => o.id === id);
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setSelectedOrders((prev) => { const next = new Map(prev); if (next.has(id)) next.delete(id); else if (order) next.set(id, order); return next; });
  }
  function toggleSelectAll() {
    const pageIds = orders.map((o) => o.id);
    const allPageSelected = pageIds.every((id) => selected.has(id));
    setSelected((prev) => { const next = new Set(prev); if (allPageSelected) pageIds.forEach((id) => next.delete(id)); else pageIds.forEach((id) => next.add(id)); return next; });
    setSelectedOrders((prev) => { const next = new Map(prev); if (allPageSelected) pageIds.forEach((id) => next.delete(id)); else orders.forEach((o) => next.set(o.id, o)); return next; });
  }

  const selectionSummary = useMemo(() => {
    if (selected.size === 0) return null;
    const sel = Array.from(selectedOrders.values());
    const byService: Record<string, { meters: number; total: number }> = {};
    let grandTotal = 0;
    for (const o of sel) { if (!byService[o.service]) byService[o.service] = { meters: 0, total: 0 }; byService[o.service].meters += o.meters; byService[o.service].total += o.total_amount; grandTotal += o.total_amount; }
    return { byService, grandTotal, count: sel.length };
  }, [selected, selectedOrders]);

  const selectedClientIds = useMemo(() => { const ids = new Set<string>(); selectedOrders.forEach((o) => ids.add(o.client_id)); return Array.from(ids); }, [selected, selectedOrders]);

  async function handleExportExcel(forClientId?: string) {
    const sel = Array.from(selectedOrders.values());
    const filtered = forClientId ? sel.filter((o) => o.client_id === forClientId) : sel;
    if (filtered.length === 0) return;
    setExporting(true); setShowClientPicker(false);
    try { await downloadExcelExport(filtered.map((o) => o.id)); } catch (e) { setError(e instanceof Error ? e.message : 'Error exportando Excel'); } finally { setExporting(false); }
  }
  function onExportClick() { if (selectedClientIds.length > 1) setShowClientPicker(true); else handleExportExcel(); }

  // --- Facturar logic ---
  const facturableOrders = useMemo(() => Array.from(selectedOrders.values()).filter((o) => !o.invoice_id), [selectedOrders, selected]);
  const facturarClientIds = useMemo(() => { const ids = new Set<string>(); facturableOrders.forEach((o) => ids.add(o.client_id)); return Array.from(ids); }, [facturableOrders]);
  const facturarClientMissing = useMemo(() => {
    if (facturarClientIds.length !== 1) return null;
    const client = clientMap[facturarClientIds[0]]; if (!client) return null;
    const missing: string[] = [];
    if (!client.rut) missing.push('RUT'); if (!client.giro) missing.push('Giro'); if (!client.comuna) missing.push('Comuna'); if (!client.ciudad) missing.push('Ciudad'); if (!client.billing_addr) missing.push('Dirección');
    return missing.length > 0 ? missing : null;
  }, [facturarClientIds, clientMap]);

  async function onFacturarClick() {
    if (facturableOrders.length === 0) return;
    if (facturarClientIds.length > 1) { setError('Selecciona órdenes de un solo cliente para facturar'); setTimeout(() => setError(''), 3000); return; }
    setPreviewLoading(true); setPreviewUrl(null); setShowFacturarPreview(true);
    try { const blobUrl = await apiPreviewInvoice(facturableOrders.map((o) => Number(o.id))); setPreviewUrl(blobUrl); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error obteniendo preview'); setTimeout(() => setError(''), 5000); setShowFacturarPreview(false); }
    finally { setPreviewLoading(false); }
  }

  async function handleEmitirFactura() {
    if (facturableOrders.length === 0 || facturarClientIds.length !== 1) return;
    setFacturando(true);
    try {
      const today = new Date();
      let fchVenc: string;
      if (fmaPago === 2) { const venc = new Date(today); venc.setDate(venc.getDate() + diasVencimiento); fchVenc = venc.toISOString().split('T')[0]; } else { fchVenc = today.toISOString().split('T')[0]; }
      await apiCreateInvoice(facturableOrders.map((o) => Number(o.id)), fmaPago, fchVenc);
    } catch { /* silently continue — SII processes async */ }
    setShowFacturarPreview(false); setPreviewUrl(null); setSelected(new Set()); setSelectedOrders(new Map()); setFmaPago(2); setDiasVencimiento(30);
    setFeedback('sii'); setTimeout(() => setFeedback(''), 5000); setFacturando(false); await loadOrders();
  }

  async function handleTogglePaid(order: Order) {
    if (!order.is_paid) { setSingleMarkPaidOrder(order); setShowMarkPaidConfirm(true); return; }
    try { await apiUpdateOrder(order.id, { is_paid: false }); setFeedback(`Orden #${order.id} marcada como no pagada`); setTimeout(() => setFeedback(''), 3000); await loadOrders(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error actualizando orden'); }
  }

  async function handleBulkCotizacion() {
    const ids = Array.from(selected); if (ids.length === 0) return;
    setGeneratingBulkPdf(true);
    try { await openBulkCotizacion(ids); } catch (e) { setError(e instanceof Error ? e.message : 'Error generando cotización'); } finally { setGeneratingBulkPdf(false); }
  }

  const unpaidSelected = useMemo(() => Array.from(selectedOrders.values()).filter((o) => !o.is_paid), [selectedOrders]);
  const markPaidOrders = useMemo(() => singleMarkPaidOrder ? [singleMarkPaidOrder] : unpaidSelected, [singleMarkPaidOrder, unpaidSelected]);

  const markPaidSummary = useMemo(() => {
    if (markPaidOrders.length === 0) return null;
    const byClient: Record<string, { name: string; orders: Order[] }> = {};
    let grandTotal = 0;
    for (const o of markPaidOrders) { if (!byClient[o.client_id]) byClient[o.client_id] = { name: clientMap[o.client_id]?.name || `#${o.client_id}`, orders: [] }; byClient[o.client_id].orders.push(o); grandTotal += o.total_amount; }
    return { byClient, grandTotal, count: markPaidOrders.length };
  }, [markPaidOrders, clientMap]);

  async function handleBulkMarkPaid() {
    const ids = markPaidOrders.map((o) => o.id); if (ids.length === 0) return;
    setMarkingPaid(true);
    try { const updated = await apiBulkMarkPaid(ids); setFeedback(`${updated} orden${updated > 1 ? 'es' : ''} marcada${updated > 1 ? 's' : ''} como pagada${updated > 1 ? 's' : ''}`); setTimeout(() => setFeedback(''), 3000); setSelected(new Set()); setSelectedOrders(new Map()); setSingleMarkPaidOrder(null); setShowMarkPaidConfirm(false); await loadOrders(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error marcando órdenes como pagadas'); } finally { setMarkingPaid(false); }
  }

  async function handleDeleteOrder() {
    if (!deleteOrder) return;
    setDeleting(true);
    try {
      await apiDeleteOrder(deleteOrder.id);
      setFeedback(`Orden #${deleteOrder.id} eliminada`); setTimeout(() => setFeedback(''), 3000);
      setDeleteOrder(null); selected.delete(deleteOrder.id); setSelected(new Set(selected)); selectedOrders.delete(deleteOrder.id); setSelectedOrders(new Map(selectedOrders));
      if (editing?.id === deleteOrder.id) closeEdit(); await loadOrders();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error eliminando orden'); } finally { setDeleting(false); }
  }

  function clearFilters() { setFilterClient(''); setFilterService(''); setFilterPayment('unpaid'); setFilterDateFrom(''); setFilterDateTo(''); setPage(1); }

  // Edit panel quick-action handlers
  function handleEditMarkPaid(order: Order) { closeEdit(); setSingleMarkPaidOrder(order); setShowMarkPaidConfirm(true); }
  function handleEditFacturar(order: Order) {
    closeEdit(); setSelected(new Set([order.id])); setSelectedOrders(new Map([[order.id, order]]));
    setPreviewLoading(true); setPreviewUrl(null); setShowFacturarPreview(true);
    apiPreviewInvoice([Number(order.id)]).then((blobUrl) => setPreviewUrl(blobUrl)).catch((e) => { setError(e instanceof Error ? e.message : 'Error obteniendo preview'); setShowFacturarPreview(false); }).finally(() => setPreviewLoading(false));
  }
  function handleEditDelete(order: Order) { closeEdit(); setDeleteOrder(order); }

  return (
    <div className={`order-list ${selectionSummary ? 'has-selection' : ''}`}>
      {feedback && feedback !== 'sii' && <div className="feedback-msg">{feedback}</div>}
      {feedback === 'sii' && (
        <div className="sii-feedback">
          <img src="/images/sii.png" alt="SII" className="sii-feedback-img" />
          <div>
            <span className="sii-feedback-title">Factura enviada al SII</span>
            <span className="sii-feedback-desc">El documento fue enviado correctamente al Servicio de Impuestos Internos para su procesamiento.</span>
          </div>
        </div>
      )}
      {error && <div className="error-msg">{error}</div>}

      <OrderFilters filterClient={filterClient} filterService={filterService} filterPayment={filterPayment} filterDateFrom={filterDateFrom} filterDateTo={filterDateTo} showFilters={showFilters} clients={clients} userRole={userRole} onFilterClientChange={setFilterClient} onFilterServiceChange={setFilterService} onFilterPaymentChange={setFilterPayment} onFilterDateFromChange={setFilterDateFrom} onFilterDateToChange={setFilterDateTo} onToggleFilters={() => setShowFilters(!showFilters)} onClear={clearFilters} />

      <OrderTable orders={orders} loading={loading} selected={selected} clientMap={clientMap} userRole={userRole} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} onOpenEdit={openEdit} onTogglePaid={handleTogglePaid} onSetDeleteOrder={setDeleteOrder} />

      <OrderMobileCards orders={orders} loading={loading} selected={selected} clientMap={clientMap} userRole={userRole} onToggleSelect={toggleSelect} onOpenEdit={openEdit} onTogglePaid={handleTogglePaid} />

      {selectionSummary && (
        <OrderSelectionBar selectionSummary={selectionSummary} selectedClientIds={selectedClientIds} unpaidSelectedCount={unpaidSelected.length} facturableCount={facturableOrders.length} exporting={exporting} generatingBulkPdf={generatingBulkPdf} markingPaid={markingPaid} previewLoading={previewLoading} onExportClick={onExportClick} onBulkCotizacion={handleBulkCotizacion} onMarkPaidClick={() => setShowMarkPaidConfirm(true)} onFacturarClick={onFacturarClick} onDeselect={() => { setSelected(new Set()); setSelectedOrders(new Map()); }} />
      )}

      {showClientPicker && (
        <div className="modal-backdrop" onClick={() => setShowClientPicker(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Seleccionar cliente</h3>
            <p className="modal-desc">Las órdenes seleccionadas pertenecen a varios clientes. Elige uno para exportar.</p>
            <div className="modal-client-list">
              {selectedClientIds.map((cid) => {
                const client = clientMap[cid];
                const count = Array.from(selectedOrders.values()).filter((o) => o.client_id === cid).length;
                return (
                  <button key={cid} className="modal-client-btn" onClick={() => handleExportExcel(cid)}>
                    <span className="mcb-name">{client?.name || `Cliente #${cid}`}</span>
                    <span className="mcb-count">{count} orden{count > 1 ? 'es' : ''}</span>
                  </button>
                );
              })}
            </div>
            <button className="btn-sm modal-cancel" onClick={() => setShowClientPicker(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showMarkPaidConfirm && markPaidSummary && (
        <MarkPaidModal markPaidSummary={markPaidSummary} onConfirm={handleBulkMarkPaid} onCancel={() => { setShowMarkPaidConfirm(false); setSingleMarkPaidOrder(null); }} markingPaid={markingPaid} />
      )}

      {showFacturarPreview && (
        <FacturarModal facturableOrders={facturableOrders} clientMap={clientMap} facturarClientIds={facturarClientIds} facturarClientMissing={facturarClientMissing} previewUrl={previewUrl} previewLoading={previewLoading} fmaPago={fmaPago} diasVencimiento={diasVencimiento} facturando={facturando} onFmaPagoChange={setFmaPago} onDiasVencimientoChange={setDiasVencimiento} onEmitir={handleEmitirFactura} onCancel={() => { setShowFacturarPreview(false); setPreviewUrl(null); }} onNavigateClients={() => { setShowFacturarPreview(false); setPreviewUrl(null); onNavigate('clients'); }} />
      )}

      {deleteOrder && (
        <DeleteOrderModal order={deleteOrder} clientMap={clientMap} onConfirm={handleDeleteOrder} onCancel={() => setDeleteOrder(null)} deleting={deleting} />
      )}

      {editing && (
        <OrderEditPanel editing={editing} loadingEditClient={loadingEditClient} clientMap={clientMap} orders={orders} userRole={userRole} collapsedSections={collapsedSections} editAutoPrice={editAutoPrice} editFinalPrice={editFinalPrice} editIsManualOverride={editIsManualOverride} editIsManualOnly={editIsManualOnly} editCalc={editCalc} editHasTiers={editHasTiers} saving={saving} onToggleSection={toggleSection} onEditChange={setEditing} onSave={handleSaveEdit} onClose={closeEdit} onImageUpload={handleEditImageUpload} onSetError={setError} onMarkPaid={handleEditMarkPaid} onFacturar={handleEditFacturar} onDelete={handleEditDelete} />
      )}

      <div className="order-footer">
        <span>{total} órdenes — Página: {formatCLP(pageTotal)}</span>
        <div className="pagination">
          <label className="page-size-label">
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} por página</option>)}
            </select>
          </label>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Anterior</button>
          <span>Pág {page} de {Math.max(totalPages, 1)}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente →</button>
        </div>
      </div>
    </div>
  );
}
