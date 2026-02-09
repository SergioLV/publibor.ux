import { useMemo, useState, useEffect } from 'react';
import { fetchClients, fetchOrders } from '../data/api';
import { SERVICE_TYPES } from '../data/types';
import type { Client, Order } from '../data/types';
import { formatCLP } from '../data/format';
import './Dashboard.css';

interface Props {
  onNavigate: (view: string) => void;
}

export default function Dashboard({ onNavigate }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    fetchClients({ limit: 100 }).then((res) => setClients(res.clients)).catch(() => {});
    fetchOrders({ limit: 100 }).then((res) => setOrders(res.orders)).catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const unpaid = orders.filter((o) => !o.is_paid);
    const unpaidTotal = unpaid.reduce((s, o) => s + o.total_amount, 0);
    const paidTotal = orders.filter((o) => o.is_paid).reduce((s, o) => s + o.total_amount, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ordersToday = orders.filter((o) => new Date(o.created_at) >= today);

    const clientOrders: Record<string, number> = {};
    orders.forEach((o) => {
      clientOrders[o.client_id] = (clientOrders[o.client_id] || 0) + 1;
    });
    const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
    const topClients = Object.entries(clientOrders)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ name: clientMap[id]?.name || '—', count }));

    const byService: Record<string, { count: number; total: number }> = {};
    orders.forEach((o) => {
      if (!byService[o.service]) byService[o.service] = { count: 0, total: 0 };
      byService[o.service].count++;
      byService[o.service].total += o.total_amount;
    });

    return { unpaidTotal, paidTotal, unpaidCount: unpaid.length, ordersToday: ordersToday.length, totalOrders: orders.length, activeClients: clients.filter((c) => c.is_active).length, topClients, byService };
  }, [orders, clients]);

  return (
    <div className="dashboard">
      <div className="stat-grid">
        <div className="stat-card accent">
          <span className="stat-label">Por cobrar</span>
          <span className="stat-value">{formatCLP(stats.unpaidTotal)}</span>
          <span className="stat-sub">{stats.unpaidCount} órdenes sin pagar</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Cobrado</span>
          <span className="stat-value">{formatCLP(stats.paidTotal)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Órdenes hoy</span>
          <span className="stat-value">{stats.ordersToday}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Clientes activos</span>
          <span className="stat-value">{stats.activeClients}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dash-panel">
          <h3>Por servicio</h3>
          {SERVICE_TYPES.map((s) => {
            const data = stats.byService[s];
            return (
              <div key={s} className="service-row">
                <span className="service-name">{s}</span>
                <span className="service-count">{data?.count || 0} órdenes</span>
                <span className="service-total">{formatCLP(data?.total || 0)}</span>
              </div>
            );
          })}
        </div>

        <div className="dash-panel">
          <h3>Top clientes</h3>
          {stats.topClients.length === 0 && <p className="empty-text">Sin órdenes aún</p>}
          {stats.topClients.map((c, i) => (
            <div key={i} className="top-client-row">
              <span className="top-rank">{i + 1}</span>
              <span className="top-name">{c.name}</span>
              <span className="top-count">{c.count} órdenes</span>
            </div>
          ))}
        </div>
      </div>

      <div className="quick-actions">
        <button className="btn-primary" onClick={() => onNavigate('new-order')}>＋ Nueva Orden</button>
        <button className="btn-secondary" onClick={() => onNavigate('orders')}>Ver Órdenes</button>
        <button className="btn-secondary" onClick={() => onNavigate('clients')}>Ver Clientes</button>
      </div>
    </div>
  );
}
