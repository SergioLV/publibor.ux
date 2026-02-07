import { useState, useMemo, useEffect } from 'react';
import { getOrders, togglePaid } from '../data/store';
import { fetchClients } from '../data/api';
import { formatCLP, formatDate } from '../data/format';
import type { Order, Client } from '../data/types';
import './OrderList.css';

const PAGE_SIZE = 25;

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>(getOrders());
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    fetchClients({ limit: 500 }).then((res) => setClients(res.clients)).catch(() => {});
  }, []);

  const clientMap = useMemo(() => {
    const m: Record<string, Client> = {};
    clients.forEach((c) => (m[c.id] = c));
    return m;
  }, [clients]);

  const [filterClient, setFilterClient] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterPayment, setFilterPayment] = useState<'unpaid' | 'paid' | 'all'>('unpaid');
  const [page, setPage] = useState(0);
  const [feedback, setFeedback] = useState('');

  const filtered = useMemo(() => {
    let result = [...orders];
    if (filterClient) result = result.filter((o) => o.client_id === filterClient);
    if (filterFrom) {
      const from = new Date(filterFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((o) => new Date(o.created_at) >= from);
    }
    if (filterTo) {
      const to = new Date(filterTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((o) => new Date(o.created_at) <= to);
    }
    if (filterPayment === 'unpaid') result = result.filter((o) => !o.is_paid);
    else if (filterPayment === 'paid') result = result.filter((o) => o.is_paid);
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [orders, filterClient, filterFrom, filterTo, filterPayment]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageTotal = paged.reduce((s, o) => s + o.total_amount, 0);
  const allTotal = filtered.reduce((s, o) => s + o.total_amount, 0);

  function handleTogglePaid(orderId: string) {
    const updated = togglePaid(orderId);
    if (updated) {
      setOrders(getOrders());
      setFeedback(`Orden #${orderId} ${updated.is_paid ? 'marcada como pagada' : 'marcada como no pagada'}`);
      setTimeout(() => setFeedback(''), 3000);
    }
  }

  function clearFilters() {
    setFilterClient('');
    setFilterFrom('');
    setFilterTo('');
    setFilterPayment('unpaid');
    setPage(0);
  }

  return (
    <div className="order-list">
      {feedback && <div className="feedback-msg">{feedback}</div>}

      <div className="order-filters">
        <label>Cliente
          <select value={filterClient} onChange={(e) => { setFilterClient(e.target.value); setPage(0); }}>
            <option value="">Todos</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Desde
          <input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(0); }} />
        </label>
        <label>Hasta
          <input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(0); }} />
        </label>
        <label>Pago
          <select value={filterPayment} onChange={(e) => { setFilterPayment(e.target.value as 'unpaid' | 'paid' | 'all'); setPage(0); }}>
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
            <th>Metros</th>
            <th>Precio Unit.</th>
            <th>Total</th>
            <th>Pagado</th>
          </tr>
        </thead>
        <tbody>
          {paged.map((o) => (
            <tr key={o.id}>
              <td>{formatDate(o.created_at)}</td>
              <td>{clientMap[o.client_id]?.name || '—'}</td>
              <td>{o.service}</td>
              <td>{o.meters}</td>
              <td>{formatCLP(o.unit_price)}</td>
              <td>{formatCLP(o.total_amount)}</td>
              <td>
                <input
                  type="checkbox"
                  checked={o.is_paid}
                  onChange={() => handleTogglePaid(o.id)}
                />
              </td>
            </tr>
          ))}
          {paged.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: 'center' }}>Sin órdenes</td></tr>
          )}
        </tbody>
      </table>
      </div>

      <div className="order-footer">
        <span>{filtered.length} órdenes — Página: {formatCLP(pageTotal)} | Total filtrado: {formatCLP(allTotal)}</span>
        <div className="pagination">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>← Anterior</button>
          <span>Pág {page + 1} de {Math.max(totalPages, 1)}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Siguiente →</button>
        </div>
      </div>
    </div>
  );
}
