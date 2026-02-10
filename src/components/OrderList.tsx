import { useState, useMemo, useEffect, useCallback } from 'react';
import { fetchClients, fetchOrders, apiUpdateOrder, getCotizacionUrl, downloadExcelExport } from '../data/api';
import { formatCLP, formatDate } from '../data/format';
import type { Order, Client, ServiceType } from '../data/types';
import { SERVICE_TYPES, unitLabel } from '../data/types';
import './OrderList.css';

const PAGE_SIZES = [10, 25, 50, 100];

export default function OrderList() {
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
  const [pageSize, setPageSize] = useState(25);
  const [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Map<string, Order>>(new Map());
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchClients({ limit: 100 }).then((res) => setClients(res.clients)).catch(() => {});
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

  // Reset to page 1 when filters or page size change
  const filterKey = `${filterClient}|${filterService}|${filterPayment}|${filterDateFrom}|${filterDateTo}|${pageSize}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    if (page !== 1) setPage(1);
  }

  const pageTotal = orders.reduce((s, o) => s + o.total_amount, 0);

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

  async function handleTogglePaid(order: Order) {
    try {
      await apiUpdateOrder(order.id, { is_paid: !order.is_paid });
      setFeedback(`Orden #${order.id} ${!order.is_paid ? 'marcada como pagada' : 'marcada como no pagada'}`);
      setTimeout(() => setFeedback(''), 3000);
      await loadOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error actualizando orden');
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
    <div className="order-list">
      {feedback && <div className="feedback-msg">{feedback}</div>}
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
            <th>Pagado</th>
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
              <td className="order-id-cell">#{o.id}</td>
              <td>{formatDate(o.created_at)}</td>
              <td>{clientMap[o.client_id]?.name || '—'}</td>
              <td>{o.service}</td>
              <td className="desc-cell">{o.description || '—'}</td>
              <td>{o.meters} {unitLabel(o.service as ServiceType)}</td>
              <td>{formatCLP(o.unit_price)}</td>
              <td>{formatCLP(o.total_amount)}</td>
              <td>
                <input
                  type="checkbox"
                  checked={o.is_paid}
                  onChange={() => handleTogglePaid(o)}
                />
              </td>
              <td>
                <a href={getCotizacionUrl(o.id)} target="_blank" rel="noopener noreferrer" className="btn-sm btn-pdf" title="Descargar cotización">
                  PDF
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
