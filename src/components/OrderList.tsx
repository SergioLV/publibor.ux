import { useState, useMemo, useEffect, useCallback } from 'react';
import { fetchClients, fetchOrders, apiUpdateOrder, apiBulkMarkPaid, getCotizacionUrl, openBulkCotizacion, downloadExcelExport, fetchDefaultPrices, fetchClientById, apiCreateInvoice, apiPreviewInvoice } from '../data/api';
import { formatCLP, formatDate, formatDateShort } from '../data/format';
import type { Order, Client, PriceTier, ServiceType, PurchaseOrder } from '../data/types';
import { SERVICE_TYPES, unitLabel, isPerCloth } from '../data/types';
import { getEffectivePrice, calculateOrder } from '../data/store';
import './OrderList.css';

const PAGE_SIZES = [10, 25, 50, 100];

interface EditingOrder {
  id: string;
  client_id: string;
  service: ServiceType;
  description: string;
  meters: string;
  priceOverride: string;
  purchase_orders: PurchaseOrder[];
}

export default function OrderList({ onNavigate }: { onNavigate: (view: string) => void }) {
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
  const [fmaPago, setFmaPago] = useState<1 | 2>(1);
  const [diasVencimiento, setDiasVencimiento] = useState(30);

  // Edit modal state
  const [editing, setEditing] = useState<EditingOrder | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [loadingEditClient, setLoadingEditClient] = useState(false);
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClients({ limit: 100 }).then((res) => setClients(res.clients)).catch(() => {});
    fetchDefaultPrices().then(setTiers).catch(() => {});
  }, []);

  const clientMap = useMemo(() => {
    const m: Record<string, Client> = {};
    clients.forEach((c) => (m[c.id] = c));
    return m;
  }, [clients]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchOrders({
        client_id: filterClient || undefined,
        service: filterService || undefined,
        is_paid: filterPayment === 'all' ? undefined : filterPayment === 'paid',
        date_from: filterDateFrom || undefined,
        date_to: filterDateTo || undefined,
        page,
        limit: pageSize,
      });
      setOrders(res.orders);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando órdenes');
    } finally {
      setLoading(false);
    }
  }, [filterClient, filterService, filterPayment, filterDateFrom, filterDateTo, page, pageSize]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filterKey = `${filterClient}|${filterService}|${filterPayment}|${filterDateFrom}|${filterDateTo}|${pageSize}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    if (page !== 1) setPage(1);
  }

  const pageTotal = orders.reduce((s, o) => s + o.total_amount, 0);

  // --- Edit modal logic ---

  const availableServices = useMemo(() => {
    const services = new Set(tiers.map((t) => t.service));
    return SERVICE_TYPES.filter((s) => services.has(s));
  }, [tiers]);

  async function openEdit(order: Order) {
    setEditing({
      id: order.id,
      client_id: order.client_id,
      service: order.service,
      description: order.description || '',
      meters: String(order.meters),
      priceOverride: '',
      purchase_orders: order.purchase_orders || [],
    });
    setLoadingEditClient(true);
    try {
      const client = await fetchClientById(order.client_id);
      setEditClient(client);
    } catch {
      setEditClient(null);
    } finally {
      setLoadingEditClient(false);
    }
  }

  function closeEdit() {
    setEditing(null);
    setEditClient(null);
    setLoadingEditClient(false);
  }

  const editAutoPrice = useMemo(() => {
    if (!editing || !editClient || !editing.service || !editing.meters || Number(editing.meters) < 0.1) return null;
    return getEffectivePrice(editClient, tiers, editing.service, Number(editing.meters));
  }, [editing, editClient, tiers]);

  const editFinalPrice = editing && editing.priceOverride && Number(editing.priceOverride) > 0
    ? Number(editing.priceOverride)
    : editAutoPrice?.price ?? null;

  const editIsManualOverride = editing
    && editing.priceOverride !== ''
    && Number(editing.priceOverride) > 0
    && editAutoPrice
    && Number(editing.priceOverride) !== editAutoPrice.price;

  const editCalc = useMemo(() => {
    if (!editFinalPrice || !editing || !editing.meters || Number(editing.meters) < 0.1) return null;
    return calculateOrder(editFinalPrice, Number(editing.meters));
  }, [editFinalPrice, editing]);

  async function handleSaveEdit() {
    if (!editing || !editCalc) return;
    setSaving(true);
    setError('');
    try {
      await apiUpdateOrder(editing.id, {
        service: editing.service,
        description: editing.description.trim() || undefined,
        meters: Number(editing.meters),
        unit_price: editIsManualOverride ? Number(editing.priceOverride) : undefined,
        purchase_orders: editing.purchase_orders.filter(po => po.oc_number.trim()),
      });
      setFeedback(`Orden #${editing.id} actualizada`);
      setTimeout(() => setFeedback(''), 3000);
      closeEdit();
      await loadOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error actualizando orden');
    } finally {
      setSaving(false);
    }
  }

  // --- Selection logic ---

  function toggleSelect(id: string) {
    const order = orders.find((o) => o.id === id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelectedOrders((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id); else if (order) next.set(id, order);
      return next;
    });
  }

  function toggleSelectAll() {
    const pageIds = orders.map((o) => o.id);
    const allPageSelected = pageIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
    setSelectedOrders((prev) => {
      const next = new Map(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        orders.forEach((o) => next.set(o.id, o));
      }
      return next;
    });
  }

  const selectionSummary = useMemo(() => {
    if (selected.size === 0) return null;
    const sel = Array.from(selectedOrders.values());
    const byService: Record<string, { meters: number; total: number }> = {};
    let grandTotal = 0;
    for (const o of sel) {
      if (!byService[o.service]) byService[o.service] = { meters: 0, total: 0 };
      byService[o.service].meters += o.meters;
      byService[o.service].total += o.total_amount;
      grandTotal += o.total_amount;
    }
    return { byService, grandTotal, count: sel.length };
  }, [selected, selectedOrders]);

  const selectedClientIds = useMemo(() => {
    const ids = new Set<string>();
    selectedOrders.forEach((o) => ids.add(o.client_id));
    return Array.from(ids);
  }, [selected, selectedOrders]);

  async function handleExportExcel(forClientId?: string) {
    const sel = Array.from(selectedOrders.values());
    const filtered = forClientId ? sel.filter((o) => o.client_id === forClientId) : sel;
    if (filtered.length === 0) return;
    const ids = filtered.map((o) => o.id);
    setExporting(true);
    setShowClientPicker(false);
    try {
      await downloadExcelExport(ids);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error exportando Excel');
    } finally {
      setExporting(false);
    }
  }

  function onExportClick() {
    if (selectedClientIds.length > 1) {
      setShowClientPicker(true);
    } else {
      handleExportExcel();
    }
  }

  // --- Facturar logic ---
  const facturableOrders = useMemo(() => {
    return Array.from(selectedOrders.values()).filter((o) => !o.invoice_id);
  }, [selectedOrders, selected]);

  const facturarClientIds = useMemo(() => {
    const ids = new Set<string>();
    facturableOrders.forEach((o) => ids.add(o.client_id));
    return Array.from(ids);
  }, [facturableOrders]);

  const facturarClientMissing = useMemo(() => {
    if (facturarClientIds.length !== 1) return null;
    const client = clientMap[facturarClientIds[0]];
    if (!client) return null;
    const missing: string[] = [];
    if (!client.rut) missing.push('RUT');
    if (!client.giro) missing.push('Giro');
    if (!client.comuna) missing.push('Comuna');
    if (!client.ciudad) missing.push('Ciudad');
    if (!client.billing_addr) missing.push('Dirección');
    return missing.length > 0 ? missing : null;
  }, [facturarClientIds, clientMap]);

  async function onFacturarClick() {
    if (facturableOrders.length === 0) return;
    if (facturarClientIds.length > 1) {
      setError('Selecciona órdenes de un solo cliente para facturar');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setPreviewLoading(true);
    setPreviewUrl(null);
    setShowFacturarPreview(true);
    try {
      const blobUrl = await apiPreviewInvoice(facturableOrders.map((o) => Number(o.id)));
      setPreviewUrl(blobUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error obteniendo preview');
      setTimeout(() => setError(''), 5000);
      setShowFacturarPreview(false);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleEmitirFactura() {
    if (facturableOrders.length === 0 || facturarClientIds.length !== 1) return;
    setFacturando(true);
    try {
      const today = new Date();
      let fchVenc: string;
      if (fmaPago === 2) {
        const venc = new Date(today);
        venc.setDate(venc.getDate() + diasVencimiento);
        fchVenc = venc.toISOString().split('T')[0];
      } else {
        fchVenc = today.toISOString().split('T')[0];
      }
      await apiCreateInvoice(facturableOrders.map((o) => Number(o.id)), fmaPago, fchVenc);
    } catch {
      // silently continue — SII processes async
    }
    setShowFacturarPreview(false);
    setPreviewUrl(null);
    setSelected(new Set());
    setSelectedOrders(new Map());
    setFmaPago(1);
    setDiasVencimiento(30);
    setFeedback('sii');
    setTimeout(() => setFeedback(''), 5000);
    setFacturando(false);
    await loadOrders();
  }

  async function handleTogglePaid(order: Order) {
    if (!order.is_paid) {
      // Show confirm modal for marking as paid
      setSingleMarkPaidOrder(order);
      setShowMarkPaidConfirm(true);
      return;
    }
    // Unmark paid — no confirmation needed
    try {
      await apiUpdateOrder(order.id, { is_paid: false });
      setFeedback(`Orden #${order.id} marcada como no pagada`);
      setTimeout(() => setFeedback(''), 3000);
      await loadOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error actualizando orden');
    }
  }

  async function handleBulkCotizacion() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setGeneratingBulkPdf(true);
    try {
      await openBulkCotizacion(ids);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando cotización');
    } finally {
      setGeneratingBulkPdf(false);
    }
  }

  const unpaidSelected = useMemo(() => {
    return Array.from(selectedOrders.values()).filter((o) => !o.is_paid);
  }, [selectedOrders]);

  const markPaidOrders = useMemo(() => {
    if (singleMarkPaidOrder) return [singleMarkPaidOrder];
    return unpaidSelected;
  }, [singleMarkPaidOrder, unpaidSelected]);

  const markPaidSummary = useMemo(() => {
    if (markPaidOrders.length === 0) return null;
    const byClient: Record<string, { name: string; orders: Order[] }> = {};
    let grandTotal = 0;
    for (const o of markPaidOrders) {
      if (!byClient[o.client_id]) {
        byClient[o.client_id] = { name: clientMap[o.client_id]?.name || `#${o.client_id}`, orders: [] };
      }
      byClient[o.client_id].orders.push(o);
      grandTotal += o.total_amount;
    }
    return { byClient, grandTotal, count: markPaidOrders.length };
  }, [markPaidOrders, clientMap]);

  async function handleBulkMarkPaid() {
    const ids = markPaidOrders.map((o) => o.id);
    if (ids.length === 0) return;
    setMarkingPaid(true);
    try {
      const updated = await apiBulkMarkPaid(ids);
      setFeedback(`${updated} orden${updated > 1 ? 'es' : ''} marcada${updated > 1 ? 's' : ''} como pagada${updated > 1 ? 's' : ''}`);
      setTimeout(() => setFeedback(''), 3000);
      setSelected(new Set());
      setSelectedOrders(new Map());
      setSingleMarkPaidOrder(null);
      setShowMarkPaidConfirm(false);
      await loadOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error marcando órdenes como pagadas');
    } finally {
      setMarkingPaid(false);
    }
  }

  function clearFilters() {
    setFilterClient('');
    setFilterService('');
    setFilterPayment('unpaid');
    setFilterDateFrom('');
    setFilterDateTo('');
    setPage(1);
  }

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

      <div className="order-filters">
        <label>Cliente
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
            <option value="">Todos</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Servicio
          <select value={filterService} onChange={(e) => setFilterService(e.target.value)}>
            <option value="">Todos</option>
            {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>Pago
          <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value as 'unpaid' | 'paid' | 'all')}>
            <option value="unpaid">No pagadas</option>
            <option value="paid">Pagadas</option>
            <option value="all">Todas</option>
          </select>
        </label>
        <label>Desde
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
        </label>
        <label>Hasta
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
        </label>
        <button className="btn-sm" onClick={clearFilters}>Limpiar</button>
      </div>

      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="th-check">
              <input
                type="checkbox"
                checked={orders.length > 0 && orders.every((o) => selected.has(o.id))}
                onChange={toggleSelectAll}
              />
            </th>
            <th>#</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Servicio</th>
            <th>Descripción</th>
            <th>Cantidad</th>
            <th>Precio Unit.</th>
            <th>Total</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <tr key={`skel-${i}`} className="skeleton-row">
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
          {!loading && orders.map((o) => (
            <tr key={o.id} className={selected.has(o.id) ? 'row-selected' : ''}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.has(o.id)}
                  onChange={() => toggleSelect(o.id)}
                />
              </td>
              <td className="order-id-cell">
                #{o.id}
                {o.invoice_id && <span className="invoice-badge">Facturada</span>}
              </td>
              <td title={formatDate(o.created_at)}>{formatDateShort(o.created_at)}</td>
              <td>{clientMap[o.client_id]?.name || '—'}</td>
              <td><span className={`service-pill ${o.service.toLowerCase()}`}>{o.service}</span></td>
              <td className="desc-cell">{o.description || '—'}</td>
              <td>{o.meters} {unitLabel(o.service as ServiceType)}</td>
              <td>{formatCLP(o.unit_price)}</td>
              <td>{formatCLP(o.total_amount)}</td>
              <td>
                <span
                  className={`status-badge ${o.is_paid ? 'paid' : 'unpaid'}`}
                  onClick={() => handleTogglePaid(o)}
                  title={o.is_paid ? 'Click para desmarcar pago' : 'Click para marcar como pagada'}
                >
                  {o.is_paid ? 'Pagada' : 'Pendiente'}
                </span>
              </td>
              <td className="actions-cell">
                {!o.is_paid && (
                  <button className="btn-action" onClick={() => openEdit(o)} title="Editar orden">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                )}
                <a href={getCotizacionUrl(o.id)} target="_blank" rel="noopener noreferrer" className="btn-action" title="Descargar cotización">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </a>
              </td>
            </tr>
          ))}
          {!loading && orders.length === 0 && (
            <tr><td colSpan={11} style={{ textAlign: 'center' }}>Sin órdenes</td></tr>
          )}
        </tbody>
      </table>
      </div>

      {selectionSummary && (
        <div className="selection-summary">
          <div className="ss-header">
            <span className="ss-count">{selectionSummary.count} orden{selectionSummary.count > 1 ? 'es' : ''} seleccionada{selectionSummary.count > 1 ? 's' : ''}</span>
            <div className="ss-actions">
              <button className="btn-export" onClick={onExportClick} disabled={exporting}>
                {exporting ? '⏳ Exportando...' : '📥 Exportar resumen'}
              </button>
              {selectedClientIds.length === 1 && (
                <button className="btn-cotizacion-bulk" onClick={handleBulkCotizacion} disabled={generatingBulkPdf}>
                  {generatingBulkPdf ? '⏳ Generando...' : '📄 Cotización PDF'}
                </button>
              )}
              {unpaidSelected.length > 0 && (
                <button className="btn-mark-paid" onClick={() => setShowMarkPaidConfirm(true)} disabled={markingPaid}>
                  {markingPaid ? '⏳ Marcando...' : '✓ Marcar como pagadas'}
                </button>
              )}
              {facturableOrders.length > 0 && (
                <button className="btn-facturar" onClick={onFacturarClick} disabled={previewLoading}>
                  {previewLoading ? '⏳ Cargando preview...' : `🧾 Facturar (${facturableOrders.length})`}
                </button>
              )}
              <button className="btn-sm" onClick={() => { setSelected(new Set()); setSelectedOrders(new Map()); }}>Deseleccionar</button>
            </div>
          </div>
          <div className="ss-services">
            {Object.entries(selectionSummary.byService).map(([svc, data]) => (
              <div key={svc} className="ss-service-item">
                <span className="ss-service-name">{svc}</span>
                <span className="ss-service-qty">{data.meters} {unitLabel(svc as ServiceType)}</span>
                <span className="ss-service-total">{formatCLP(data.total)}</span>
              </div>
            ))}
          </div>
          <div className="ss-grand-total">
            <span>Total selección</span>
            <span className="ss-grand-amount">{formatCLP(selectionSummary.grandTotal)}</span>
          </div>
        </div>
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

      {/* Confirm Mark Paid Modal */}
      {showMarkPaidConfirm && markPaidSummary && (
        <div className="modal-backdrop" onClick={() => { setShowMarkPaidConfirm(false); setSingleMarkPaidOrder(null); }}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cm-header">
              <h3>Confirmar pago</h3>
              <button className="eom-close" onClick={() => { setShowMarkPaidConfirm(false); setSingleMarkPaidOrder(null); }}>✕</button>
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
              <button className="btn-ghost" onClick={() => { setShowMarkPaidConfirm(false); setSingleMarkPaidOrder(null); }}>Cancelar</button>
              <button className="btn-mark-paid" onClick={handleBulkMarkPaid} disabled={markingPaid}>
                {markingPaid ? '⏳ Marcando...' : `✓ Confirmar pago`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facturar Preview Modal */}
      {showFacturarPreview && (
        <div className="modal-backdrop" onClick={() => { setShowFacturarPreview(false); setPreviewUrl(null); }}>
          <div className="facturar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fm-header">
              <div className="fm-header-left">
                <img src="/images/sii.png" alt="SII" className="fm-sii-logo" />
                <div>
                  <h3>Emitir Factura Electrónica</h3>
                  <span className="fm-subtitle">Tipo 33 — {clientMap[facturarClientIds[0]]?.name || '—'}</span>
                </div>
              </div>
              <button className="eom-close" onClick={() => { setShowFacturarPreview(false); setPreviewUrl(null); }}>✕</button>
            </div>
            <div className="fm-content">
              <div className="fm-preview-pane">
                {previewLoading && (
                  <div className="fm-preview-loading">
                    <span>⏳ Cargando preview...</span>
                  </div>
                )}
                {previewUrl && (
                  <iframe src={previewUrl} className="fm-preview-iframe" title="Preview factura" />
                )}
              </div>
              <div className="fm-details-pane">
                <div className="fm-client-info">
                  <div className="fm-ci-row"><span>RUT</span><span>{clientMap[facturarClientIds[0]]?.rut || '—'}</span></div>
                  <div className="fm-ci-row"><span>Dirección</span><span>{clientMap[facturarClientIds[0]]?.billing_addr || '—'}</span></div>
                </div>
                <div className="fm-items">
                  <div className="fm-items-header">
                    <span>Orden</span><span>Servicio</span><span>Cantidad</span><span>Total</span>
                  </div>
                  {facturableOrders.map((o) => (
                    <div key={o.id} className="fm-item-row">
                      <span>#{o.id}</span>
                      <span>{o.service}</span>
                      <span>{o.meters} {unitLabel(o.service)}</span>
                      <span>{formatCLP(o.total_amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="fm-totals">
                  <div className="fm-total-row"><span>Neto</span><span>{formatCLP(facturableOrders.reduce((s, o) => s + o.subtotal, 0))}</span></div>
                  <div className="fm-total-row"><span>IVA 19%</span><span>{formatCLP(facturableOrders.reduce((s, o) => s + o.tax_amount, 0))}</span></div>
                  <div className="fm-total-row grand"><span>Total</span><span>{formatCLP(facturableOrders.reduce((s, o) => s + o.total_amount, 0))}</span></div>
                </div>
                <div className="fm-pago-section">
                  <label className="fm-pago-label">Forma de pago</label>
                  <div className="fm-pago-options">
                    <button
                      className={`fm-pago-btn ${fmaPago === 1 ? 'selected' : ''}`}
                      onClick={() => setFmaPago(1)}
                    >
                      Contado
                    </button>
                    <button
                      className={`fm-pago-btn ${fmaPago === 2 ? 'selected' : ''}`}
                      onClick={() => setFmaPago(2)}
                    >
                      Crédito
                    </button>
                  </div>
                  {fmaPago === 2 && (
                    <div className="fm-pago-dias">
                      <label>Días de vencimiento</label>
                      <input
                        type="number"
                        min="1"
                        value={diasVencimiento}
                        onChange={(e) => setDiasVencimiento(Math.max(1, Number(e.target.value)))}
                      />
                      <span className="fm-pago-venc-date">
                        Vence: {(() => {
                          const d = new Date();
                          d.setDate(d.getDate() + diasVencimiento);
                          return d.toISOString().split('T')[0];
                        })()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="fm-actions">
                  {facturarClientMissing ? (
                    <>
                      <div className="fm-missing-warning">
                        <span className="fm-missing-text">
                          ⚠️ No se puede emitir la factura, ya que los siguientes datos del cliente no están registrados: {facturarClientMissing.join(', ')}
                        </span>
                      </div>
                      <div className="fm-actions-row">
                        <button className="btn-ghost" onClick={() => { setShowFacturarPreview(false); setPreviewUrl(null); }}>Cancelar</button>
                        <button className="btn-primary" onClick={() => { setShowFacturarPreview(false); setPreviewUrl(null); onNavigate('clients'); }}>
                          Ir a Clientes
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="fm-actions-row">
                      <button className="btn-ghost" onClick={() => { setShowFacturarPreview(false); setPreviewUrl(null); }}>Cancelar</button>
                      <button className="btn-facturar-emit" onClick={handleEmitirFactura} disabled={facturando}>
                        {facturando ? '⏳ Emitiendo...' : '🧾 Emitir Factura'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editing && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="edit-order-modal" onClick={(e) => e.stopPropagation()}>
            <div className="eom-header">
              <div className="eom-header-left">
                <h3>Editar Orden #{editing.id}</h3>
                <span className="eom-client-name">{clientMap[editing.client_id]?.name || '—'}</span>
              </div>
              <button className="eom-close" onClick={closeEdit}>✕</button>
            </div>

            {loadingEditClient ? (
              <div className="eom-body">
                <div className="eom-field">
                  <label>Servicio</label>
                  <div className="eom-service-grid">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="eom-sk-service" />
                    ))}
                  </div>
                </div>
                <div className="eom-row">
                  <div className="eom-field">
                    <label>Cantidad</label>
                    <div className="eom-sk-input" />
                  </div>
                  <div className="eom-field">
                    <label>Descripción</label>
                    <div className="eom-sk-input" />
                  </div>
                </div>
                <div className="eom-sk-price-block" />
                <div className="eom-sk-po-block">
                  <div className="eom-sk-po-bar" />
                  <div className="eom-sk-po-bar short" />
                </div>
                <div className="eom-sk-summary">
                  <div className="eom-sk-summary-row" />
                  <div className="eom-sk-summary-row" />
                  <div className="eom-sk-summary-row wide" />
                </div>
              </div>
            ) : (
            <div className="eom-body">
              <div className="eom-field">
                <label>Servicio</label>
                <div className="eom-service-grid">
                  {availableServices.map((s) => (
                    <button
                      key={s}
                      className={`eom-service-btn ${editing.service === s ? 'selected' : ''}`}
                      onClick={() => setEditing({ ...editing, service: s, meters: '', priceOverride: '' })}
                    >
                      <span>{s}</span>
                      <span className="eom-service-unit">por {unitLabel(s)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="eom-row">
                <div className="eom-field">
                  <label>{isPerCloth(editing.service) ? 'Cantidad de paños' : 'Cantidad (metros)'}</label>
                  <input
                    type="number"
                    min={isPerCloth(editing.service) ? '1' : '0.1'}
                    step={isPerCloth(editing.service) ? '1' : '0.1'}
                    value={editing.meters}
                    onChange={(e) => setEditing({ ...editing, meters: e.target.value, priceOverride: '' })}
                    placeholder="0"
                  />
                </div>
                <div className="eom-field">
                  <label>Descripción</label>
                  <input
                    type="text"
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {editAutoPrice && (
                <div className="eom-price-info">
                  <span className="eom-price-suggested">
                    Precio sugerido: {formatCLP(editAutoPrice.price)}/{unitLabel(editing.service)}
                    {editAutoPrice.isOverride && <span className="eom-override-badge">Especial</span>}
                  </span>
                  <div className="eom-price-override">
                    <label>Precio unitario (CLP/{unitLabel(editing.service)})</label>
                    <div className="eom-price-input-wrap">
                      <span className="eom-price-prefix">$</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editing.priceOverride}
                        onChange={(e) => setEditing({ ...editing, priceOverride: e.target.value })}
                        placeholder={String(editAutoPrice.price)}
                      />
                    </div>
                    {editIsManualOverride && (
                      <button className="btn-sm" onClick={() => setEditing({ ...editing, priceOverride: '' })}>
                        Usar sugerido
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Purchase Orders */}
              <div className="eom-po-section">
                <div className="eom-po-header">
                  <span className="eom-po-title">Órdenes de compra</span>
                  <button
                    type="button"
                    className="eom-po-add"
                    onClick={() => setEditing({ ...editing, purchase_orders: [...editing.purchase_orders, { oc_number: '', date: '' }] })}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                    Agregar OC
                  </button>
                </div>
                {editing.purchase_orders.length === 0 && (
                  <span className="eom-po-empty">Sin órdenes de compra asociadas</span>
                )}
                {editing.purchase_orders.map((po, idx) => (
                  <div key={idx} className="eom-po-row">
                    <input
                      type="text"
                      className="eom-po-input eom-po-number"
                      value={po.oc_number}
                      onChange={(e) => {
                        const updated = [...editing.purchase_orders];
                        updated[idx] = { ...updated[idx], oc_number: e.target.value };
                        setEditing({ ...editing, purchase_orders: updated });
                      }}
                      placeholder="Nº orden de compra"
                    />
                    <input
                      type="date"
                      className="eom-po-input eom-po-date"
                      value={po.date || ''}
                      onChange={(e) => {
                        const updated = [...editing.purchase_orders];
                        updated[idx] = { ...updated[idx], date: e.target.value || undefined };
                        setEditing({ ...editing, purchase_orders: updated });
                      }}
                    />
                    <button
                      type="button"
                      className="eom-po-remove"
                      onClick={() => setEditing({ ...editing, purchase_orders: editing.purchase_orders.filter((_, i) => i !== idx) })}
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {editCalc && (
                <div className="eom-summary">
                  <div className="eom-summary-row">
                    <span>Subtotal</span>
                    <span>{formatCLP(editCalc.subtotal)}</span>
                  </div>
                  <div className="eom-summary-row">
                    <span>IVA 19%</span>
                    <span>{formatCLP(editCalc.tax_amount)}</span>
                  </div>
                  <div className="eom-summary-row total">
                    <span>Total</span>
                    <span>{formatCLP(editCalc.total_amount)}</span>
                  </div>
                </div>
              )}
            </div>
            )}

            <div className="eom-actions">
              <button className="btn-ghost" onClick={closeEdit}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveEdit} disabled={saving || !editCalc || loadingEditClient}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
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
