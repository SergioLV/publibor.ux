import { useState, useMemo, useEffect, useCallback } from 'react';
import { fetchClients, fetchOrders, apiUpdateOrder } from '../data/api';
import { formatCLP, formatDate } from '../data/format';
import type { Order, Client, ServiceType } from '../data/types';
import { SERVICE_TYPES, unitLabel } from '../data/types';
import './OrderList.css';

const PAGE_SIZE = 25;

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
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState('');

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
        page,
        limit: PAGE_SIZE,
      });
      setOrders(res.orders);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando órdenes');
    } finally {
      setLoading(false);
    }
  }, [filterClient, filterService, filterPayment, page]);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { setPage(1); }, [filterClient, filterService, filterPayment]);

  const pageTotal = orders.reduce((s, o) => s + o.total_amount, 0);

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
        <button className="btn-sm" onClick={clearFilters}>Limpiar</button>
      </div>

      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Servicio</th>
            <th>Descripción</th>
            <th>Cantidad</th>
            <th>Precio Unit.</th>
            <th>Total</th>
            <th>Pagado</th>
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <tr key={`skel-${i}`} className="skeleton-row">
              <td><span className="skeleton-cell medium" /></td>
              <td><span className="skeleton-cell wide" /></td>
              <td><span className="skeleton-cell medium" /></td>
              <td><span className="skeleton-cell short" /></td>
              <td><span className="skeleton-cell short" /></td>
              <td><span className="skeleton-cell short" /></td>
              <td><span className="skeleton-cell tiny" /></td>
            </tr>
          ))}
          {!loading && orders.map((o) => (
            <tr key={o.id}>
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
            </tr>
          ))}
          {!loading && orders.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: 'center' }}>Sin órdenes</td></tr>
          )}
        </tbody>
      </table>
      </div>

      <div className="order-footer">
        <span>{total} órdenes — Página: {formatCLP(pageTotal)}</span>
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Anterior</button>
          <span>Pág {page} de {Math.max(totalPages, 1)}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente →</button>
        </div>
      </div>
    </div>
  );
}
