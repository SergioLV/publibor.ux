import { useState, useMemo, useEffect, useCallback } from 'react';
import { fetchClients, fetchOrders, apiUpdateOrder, apiBulkMarkPaid, getCotizacionUrl, openBulkCotizacion, downloadExcelExport, fetchDefaultPrices, fetchClientById, apiCreateInvoice, apiPreviewInvoice } from '../data/api';
import type { PhotoPayload } from '../data/api';
import { formatCLP, formatDate, formatDateShort } from '../data/format';
import type { Order, Client, PriceTier, ServiceType, PurchaseOrder, OrderPhoto } from '../data/types';
import { SERVICE_TYPES, unitLabel, isPerCloth, serviceLabel } from '../data/types';
import { getEffectivePrice, calculateOrder } from '../data/store';
import './OrderList.css';

const PAGE_SIZES = [10, 25, 50, 100];

const SERVICE_ICONS: Record<string, string> = {
  DTF: '🖨️',
  SUBLIMACION: '🎨',
  UV: '💎',
  TEXTURIZADO: '🧵',
  LASER_CO2: '🔥',
  LASER_FIBRA: '⚡',
  BORDADOS: '🪡',
  TEXTIL: '👕',
  POR_CONFIRMAR: '📦',
};

interface EditingOrder {
  id: string;
  client_id: string;
  service: ServiceType;
  description: string;
  meters: string;
  priceOverride: string;
  purchase_orders: PurchaseOrder[];
  bultos: string;
  photos: OrderPhoto[];
  newPhotos: string[];
}

export default function OrderList({ onNavigate, userRole }: { onNavigate: (view: string) => void; userRole?: string }) {
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
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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

  const availableServices = SERVICE_TYPES;

  const editHasTiers = useMemo(() => {
    const services = new Set(tiers.map((t) => t.service));
    return editing ? services.has(editing.service) : false;
  }, [tiers, editing]);

  async function openEdit(order: Order) {
    setEditing({
      id: order.id,
      client_id: order.client_id,
      service: order.service,
      description: order.description || '',
      meters: String(order.meters),
      priceOverride: '',
      purchase_orders: order.purchase_orders || [],
      bultos: order.bultos ? String(order.bultos) : '',
      photos: order.photos || [],
      newPhotos: [],
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
    setLightboxSrc(null);
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

  const editIsManualOnly = editing && !editHasTiers;

  const editCalc = useMemo(() => {
    if (!editFinalPrice || !editing || !editing.meters || Number(editing.meters) < 0.1) return null;
    return calculateOrder(editFinalPrice, Number(editing.meters));
  }, [editFinalPrice, editing]);

  function handleEditImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editing) return;
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        setEditing((prev) => prev ? { ...prev, newPhotos: [...prev.newPhotos, reader.result as string] } : prev);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  async function handleSaveEdit() {
    if (!editing) return;
    if (userRole !== 'operator' && !editCalc) return;
    setSaving(true);
    setError('');
    try {
      const newPhotoPayloads: PhotoPayload[] = editing.newPhotos.map((dataUrl, i) => {
        const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) return { filename: `foto${i + 1}.jpg`, content_type: 'image/jpeg', data: dataUrl };
        const ext = match[1].split('/')[1];
        return { filename: `foto${i + 1}.${ext}`, content_type: match[1], data: match[2] };
      });
      await apiUpdateOrder(editing.id, {
        service: editing.service,
        description: editing.description.trim() || undefined,
        meters: Number(editing.meters),
        unit_price: (editIsManualOnly || editIsManualOverride) ? Number(editing.priceOverride) : undefined,
        purchase_orders: editing.purchase_orders.filter(po => po.oc_number.trim()),
        bultos: editing.bultos && Number(editing.bultos) > 0 ? Number(editing.bultos) : 0,
        photos: newPhotoPayloads.length > 0 ? newPhotoPayloads : undefined,
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

      <button className="mobile-filter-toggle" onClick={() => setShowFilters(!showFilters)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        Filtros
        <svg className={`mft-chevron ${showFilters ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div className={`order-filters ${showFilters ? 'filters-open' : ''}`}>
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
        {userRole !== 'operator' && (
        <label>Pago
          <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value as 'unpaid' | 'paid' | 'all')}>
            <option value="unpaid">No pagadas</option>
            <option value="paid">Pagadas</option>
            <option value="all">Todas</option>
          </select>
        </label>
        )}
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
            {userRole !== 'operator' && <th>Precio Unit.</th>}
            {userRole !== 'operator' && <th>Total</th>}
            {userRole !== 'operator' && <th>Estado</th>}
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
            <tr key={o.id} className={`${selected.has(o.id) ? 'row-selected' : ''} ${!o.is_paid ? 'row-clickable' : ''}`} onClick={() => !o.is_paid && openEdit(o)}>
              <td onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected.has(o.id)}
                  onChange={() => toggleSelect(o.id)}
                />
              </td>
              <td className="order-id-cell">
                #{o.id}
                {userRole !== 'operator' && o.invoice_id && <span className="invoice-badge">Facturada</span>}
              </td>
              <td title={formatDate(o.created_at)}>{formatDateShort(o.created_at)}</td>
              <td>{clientMap[o.client_id]?.name || '—'}</td>
              <td><span className={`service-pill ${o.service.toLowerCase()}`}>{serviceLabel(o.service)}</span></td>
              <td className="desc-cell">{o.description || '—'}</td>
              <td>{o.meters} {unitLabel(o.service as ServiceType)}</td>
              {userRole !== 'operator' && <td>{formatCLP(o.unit_price)}</td>}
              {userRole !== 'operator' && <td>{formatCLP(o.total_amount)}</td>}
              {userRole !== 'operator' && (
              <td onClick={(e) => e.stopPropagation()}>
                <span
                  className={`status-badge ${o.is_paid ? 'paid' : 'unpaid'}`}
                  onClick={() => handleTogglePaid(o)}
                  title={o.is_paid ? 'Click para desmarcar pago' : 'Click para marcar como pagada'}
                >
                  {o.is_paid ? 'Pagada' : 'Pendiente'}
                </span>
              </td>
              )}
              <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                {!o.is_paid && (
                  <button className="btn-action" onClick={() => openEdit(o)} title="Editar orden">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                )}
                {userRole !== 'operator' && (
                <a href={getCotizacionUrl(o.id)} target="_blank" rel="noopener noreferrer" className="btn-action" title="Descargar cotización">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </a>
                )}
              </td>
            </tr>
          ))}
          {!loading && orders.length === 0 && (
            <tr><td colSpan={11} style={{ textAlign: 'center' }}>Sin órdenes</td></tr>
          )}
        </tbody>
      </table>
      </div>

      {/* Mobile card list */}
      <div className="mobile-order-cards">
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={`mskel-${i}`} className="mobile-order-card skeleton-card">
            <div className="skeleton-cell wide" />
            <div className="skeleton-cell medium" />
            <div className="skeleton-cell short" />
          </div>
        ))}
        {!loading && orders.map((o) => (
          <div
            key={o.id}
            className={`mobile-order-card ${selected.has(o.id) ? 'card-selected' : ''} ${!o.is_paid ? 'card-clickable' : ''}`}
            onClick={() => !o.is_paid && openEdit(o)}
          >
            <div className="moc-top">
              <div className="moc-check" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} />
              </div>
              <div className="moc-info">
                <div className="moc-row-top">
                  <span className="moc-id">#{o.id}</span>
                  <span className={`service-pill ${o.service.toLowerCase()}`}>{serviceLabel(o.service)}</span>
                  {userRole !== 'operator' && o.invoice_id && <span className="invoice-badge">Facturada</span>}
                </div>
                <span className="moc-client">{clientMap[o.client_id]?.name || '—'}</span>
              </div>
              {userRole !== 'operator' && (
                <span
                  className={`status-badge ${o.is_paid ? 'paid' : 'unpaid'}`}
                  onClick={(e) => { e.stopPropagation(); handleTogglePaid(o); }}
                >
                  {o.is_paid ? 'Pagada' : 'Pendiente'}
                </span>
              )}
            </div>
            <div className="moc-details">
              <div className="moc-detail">
                <span className="moc-label">Fecha</span>
                <span>{formatDateShort(o.created_at)}</span>
              </div>
              <div className="moc-detail">
                <span className="moc-label">Cantidad</span>
                <span>{o.meters} {unitLabel(o.service as ServiceType)}</span>
              </div>
              {userRole !== 'operator' && (
                <div className="moc-detail">
                  <span className="moc-label">Total</span>
                  <span className="moc-total">{formatCLP(o.total_amount)}</span>
                </div>
              )}
            </div>
            {o.description && <div className="moc-desc">{o.description}</div>}
          </div>
        ))}
        {!loading && orders.length === 0 && (
          <div className="moc-empty">Sin órdenes</div>
        )}
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

      {/* Edit Order — Slide-over Panel */}
      {editing && (
        <>
          <div className="eom-backdrop" onClick={closeEdit} />
          <div className="eom-panel">
            <div className="eom-header">
              <div className="eom-header-left">
                <span className="eom-order-badge">#{editing.id}</span>
                <h3>{clientMap[editing.client_id]?.name || '—'}</h3>
                <span className="eom-client-tag">{SERVICE_ICONS[editing.service] ?? '📋'} {editing.service.replace('_', ' ')}</span>
              </div>
              <button className="eom-close" onClick={closeEdit}>✕</button>
            </div>

            {loadingEditClient ? (
              <div className="eom-content">
                <div className="eom-form">
                  <div className="eom-section"><div className="eom-section-body"><div className="eom-sk-block" style={{ height: 120 }} /></div></div>
                  <div className="eom-section"><div className="eom-section-body"><div className="eom-sk-block" style={{ height: 80 }} /></div></div>
                  <div className="eom-section"><div className="eom-section-body"><div className="eom-sk-block" style={{ height: 60 }} /></div></div>
                </div>
                <div className="eom-sidebar">
                  <div className="eom-sk-block" style={{ height: 160 }} />
                </div>
              </div>
            ) : (
              <div className="eom-content">
                {/* Left: Form */}
                <div className="eom-form">
                  {/* Service Section */}
                  <div className="eom-section">
                    <div className="eom-section-header">
                      <span className="eom-section-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
                        Servicio
                      </span>
                    </div>
                    <div className="eom-section-body">
                      <div className="eom-service-grid">
                        {availableServices.map((s) => (
                          <button
                            key={s}
                            className={`eom-service-btn ${editing.service === s ? 'selected' : ''}`}
                            onClick={() => setEditing({ ...editing, service: s, priceOverride: '' })}
                          >
                            <span className="eom-service-icon">{SERVICE_ICONS[s] ?? '📋'}</span>
                            <span>{s.replace('_', ' ')}</span>
                            <span className="eom-service-unit">por {unitLabel(s)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="eom-section">
                    <div className="eom-section-header">
                      <span className="eom-section-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Detalles
                      </span>
                    </div>
                    <div className="eom-section-body">
                      <div className="eom-details-grid three-col">
                        <div className="eom-field">
                          <label>{isPerCloth(editing.service) ? (editing.service === 'TEXTURIZADO' ? 'Paños' : 'Unidades') : 'Metros'}</label>
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
                          <label>Bultos</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={editing.bultos}
                            onChange={(e) => setEditing({ ...editing, bultos: e.target.value })}
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
                    </div>
                  </div>

                  {/* Price Section */}
                  {userRole !== 'operator' && (
                  <div className="eom-section">
                    <div className="eom-section-header">
                      <span className="eom-section-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        Precio
                      </span>
                      {editIsManualOverride && <span className="eom-override-badge">Override</span>}
                    </div>
                    <div className="eom-section-body">
                      {!editIsManualOnly && editAutoPrice && (
                        <div className="eom-price-suggested">
                          <span>Sugerido: {formatCLP(editAutoPrice.price)}/{unitLabel(editing.service)}</span>
                          {editAutoPrice.isOverride && <span className="eom-override-badge">Especial</span>}
                        </div>
                      )}
                      <div className="eom-price-card">
                        <div className="eom-price-input-group">
                          <span className="eom-price-prefix">$</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={editing.priceOverride}
                            onChange={(e) => setEditing({ ...editing, priceOverride: e.target.value })}
                            placeholder={editAutoPrice ? String(editAutoPrice.price) : 'Ingrese precio'}
                          />
                          <span className="eom-price-suffix">/{unitLabel(editing.service)}</span>
                        </div>
                        {editIsManualOverride && (
                          <div className="eom-price-actions">
                            <button className="btn-sm" onClick={() => setEditing({ ...editing, priceOverride: '' })}>
                              Usar sugerido
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Purchase Orders Section */}
                  {userRole !== 'operator' && (
                  <div className="eom-section">
                    <div className="eom-section-header">
                      <span className="eom-section-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                        Órdenes de compra
                      </span>
                      <button
                        type="button"
                        className="eom-po-add"
                        onClick={() => setEditing({ ...editing, purchase_orders: [...editing.purchase_orders, { oc_number: '', date: '' }] })}
                      >
                        + Agregar
                      </button>
                    </div>
                    <div className="eom-section-body">
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
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Photos Section */}
                  <div className="eom-section">
                    <div className="eom-section-header">
                      <span className="eom-section-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        Fotos
                      </span>
                    </div>
                    <div className="eom-section-body">
                      {editing.photos.length > 0 && (
                        <div className="eom-photo-grid">
                          {editing.photos.map((photo) => (
                            <div key={photo.id} className="eom-photo-thumb" onClick={() => setLightboxSrc(photo.url)}>
                              <img src={photo.url} alt={photo.filename} />
                              <button
                                className="eom-photo-remove"
                                onClick={(e) => { e.stopPropagation(); setEditing({ ...editing, photos: editing.photos.filter((p) => p.id !== photo.id) }); }}
                                title="Eliminar"
                              >✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {editing.newPhotos.length > 0 && (
                        <div className="eom-photo-grid">
                          {editing.newPhotos.map((src, idx) => (
                            <div key={`new-${idx}`} className="eom-photo-thumb" onClick={() => setLightboxSrc(src)}>
                              <img src={src} alt={`Nueva ${idx + 1}`} />
                              <button
                                className="eom-photo-remove"
                                onClick={(e) => { e.stopPropagation(); setEditing({ ...editing, newPhotos: editing.newPhotos.filter((_, i) => i !== idx) }); }}
                                title="Eliminar"
                              >✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="eom-photo-upload-row">
                        <label className="eom-photo-upload-btn">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                          </svg>
                          Tomar foto
                          <input type="file" accept="image/*" capture="environment" onChange={handleEditImageUpload} hidden />
                        </label>
                        <label className="eom-photo-upload-btn">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                          Galería
                          <input type="file" accept="image/*" multiple onChange={handleEditImageUpload} hidden />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Sidebar */}
                <div className="eom-sidebar">
                  <div className="eom-sidebar-card">
                    <div className="eom-sidebar-card-title">Resumen</div>
                    <div className="eom-sidebar-row">
                      <span>Servicio</span>
                      <span>{SERVICE_ICONS[editing.service] ?? '📋'} {editing.service.replace('_', ' ')}</span>
                    </div>
                    <div className="eom-sidebar-row">
                      <span>Cantidad</span>
                      <span>{editing.meters || '—'} {unitLabel(editing.service)}</span>
                    </div>
                    {editing.bultos && Number(editing.bultos) > 0 && (
                      <div className="eom-sidebar-row">
                        <span>Bultos</span>
                        <span>{editing.bultos}</span>
                      </div>
                    )}
                    {userRole !== 'operator' && (
                    <div className="eom-sidebar-row">
                      <span>Precio unit.</span>
                      <span>{editFinalPrice ? formatCLP(editFinalPrice) : '—'}</span>
                    </div>
                    )}
                    {editing.purchase_orders.filter(po => po.oc_number.trim()).length > 0 && (
                      <div className="eom-sidebar-row">
                        <span>OC</span>
                        <span>{editing.purchase_orders.filter(po => po.oc_number.trim()).length}</span>
                      </div>
                    )}
                    {userRole !== 'operator' && <div className="eom-sidebar-divider" />}
                    {userRole !== 'operator' && editCalc ? (
                      <>
                        <div className="eom-sidebar-row">
                          <span>Subtotal</span>
                          <span>{formatCLP(editCalc.subtotal)}</span>
                        </div>
                        <div className="eom-sidebar-row">
                          <span>IVA 19%</span>
                          <span>{formatCLP(editCalc.tax_amount)}</span>
                        </div>
                        <div className="eom-sidebar-total">
                          <span>Total</span>
                          <span>{formatCLP(editCalc.total_amount)}</span>
                        </div>
                      </>
                    ) : userRole !== 'operator' ? (
                      <div className="eom-sidebar-row">
                        <span>Total</span>
                        <span>—</span>
                      </div>
                    ) : null}
                  </div>

                  {userRole !== 'operator' && (
                  <div className="eom-sidebar-card eom-sidebar-quick">
                    <div className="eom-sidebar-card-title">Acciones rápidas</div>
                    <button
                      className="eom-quick-btn"
                      onClick={async () => {
                        try { await downloadExcelExport([editing.id]); } catch { setError('Error exportando'); }
                      }}
                    >
                      📥 Exportar resumen
                    </button>
                    <a href={getCotizacionUrl(editing.id)} target="_blank" rel="noopener noreferrer" className="eom-quick-btn">
                      📄 Cotización PDF
                    </a>
                    {!orders.find(o => o.id === editing.id)?.is_paid && (
                      <button
                        className="eom-quick-btn eom-quick-paid"
                        onClick={() => {
                          const order = orders.find(o => o.id === editing.id);
                          if (order) { closeEdit(); setSingleMarkPaidOrder(order); setShowMarkPaidConfirm(true); }
                        }}
                      >
                        ✓ Marcar como pagada
                      </button>
                    )}
                    {!orders.find(o => o.id === editing.id)?.invoice_id && (
                      <button
                        className="eom-quick-btn eom-quick-facturar"
                        onClick={async () => {
                          const order = orders.find(o => o.id === editing.id);
                          if (!order) return;
                          closeEdit();
                          setSelected(new Set([order.id]));
                          setSelectedOrders(new Map([[order.id, order]]));
                          setPreviewLoading(true);
                          setPreviewUrl(null);
                          setShowFacturarPreview(true);
                          try {
                            const blobUrl = await apiPreviewInvoice([Number(order.id)]);
                            setPreviewUrl(blobUrl);
                          } catch (e) {
                            setError(e instanceof Error ? e.message : 'Error obteniendo preview');
                            setShowFacturarPreview(false);
                          } finally {
                            setPreviewLoading(false);
                          }
                        }}
                      >
                        🧾 Facturar
                      </button>
                    )}
                  </div>
                  )}

                  <div className="eom-sidebar-actions">
                    <button className="eom-btn-save" onClick={handleSaveEdit} disabled={saving || (userRole !== 'operator' && !editCalc)}>
                      {saving ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                    </button>
                    <button className="eom-btn-cancel" onClick={closeEdit}>Cancelar</button>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile sticky bottom bar */}
            <div className="eom-mobile-bar">
              <div className="eom-mobile-summary">
                {userRole !== 'operator' && (
                <div className="eom-mobile-summary-left">
                  <span className="eom-mobile-summary-label">Total</span>
                  <span className="eom-mobile-summary-total">{editCalc ? formatCLP(editCalc.total_amount) : '—'}</span>
                </div>
                )}
                <span className="eom-mobile-summary-detail">
                  {editing.meters || '0'} {unitLabel(editing.service)}{userRole !== 'operator' ? ` · ${editFinalPrice ? formatCLP(editFinalPrice) : '—'}/${unitLabel(editing.service)}` : ''}
                </span>
              </div>
              <div className="eom-mobile-actions">
                <button className="eom-btn-cancel" onClick={closeEdit}>Cancelar</button>
                <button className="eom-btn-save" onClick={handleSaveEdit} disabled={saving || (userRole !== 'operator' && !editCalc)}>
                  {saving ? '⏳ Guardando...' : '💾 Guardar'}
                </button>
              </div>
            </div>
          </div>
          {lightboxSrc && (
            <div className="eom-lightbox" onClick={() => setLightboxSrc(null)}>
              <button className="eom-lightbox-close" onClick={() => setLightboxSrc(null)}>✕</button>
              <img src={lightboxSrc} alt="Vista ampliada" onClick={(e) => e.stopPropagation()} />
            </div>
          )}
        </>
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
