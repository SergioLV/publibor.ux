import { useMemo, useState, useEffect } from 'react';
import { fetchClients, fetchOrders, fetchInvoices } from '../data/api';
import { SERVICE_TYPES } from '../data/types';
import type { Client, Order, Invoice } from '../data/types';
import { formatCLP, formatDateShort } from '../data/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';
import './Dashboard.css';

const SERVICE_COLORS: Record<string, string> = {
  DTF: '#818cf8',
  SUBLIMACION: '#f472b6',
  UV: '#38bdf8',
  TEXTURIZADO: '#fbbf24',
};

interface Props {
  onNavigate: (view: string) => void;
}

export default function Dashboard({ onNavigate }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchClients({ limit: 100 }).then((res) => setClients(res.clients)).catch(() => {}),
      fetchOrders({ limit: 100 }).then((res) => setOrders(res.orders)).catch(() => {}),
      fetchInvoices().then(setInvoices).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const unpaid = orders.filter((o) => !o.is_paid);
    const unpaidTotal = unpaid.reduce((s, o) => s + o.total_amount, 0);
    const paid = orders.filter((o) => o.is_paid);
    const paidTotal = paid.reduce((s, o) => s + o.total_amount, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ordersToday = orders.filter((o) => new Date(o.created_at) >= today);

    const clientOrders: Record<string, { count: number; total: number }> = {};
    orders.forEach((o) => {
      if (!clientOrders[o.client_id]) clientOrders[o.client_id] = { count: 0, total: 0 };
      clientOrders[o.client_id].count++;
      clientOrders[o.client_id].total += o.total_amount;
    });
    const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
    const topClients = Object.entries(clientOrders)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([id, data]) => ({ name: clientMap[id]?.name || '—', count: data.count, total: data.total }));

    const byService: Record<string, { count: number; total: number; meters: number }> = {};
    orders.forEach((o) => {
      if (!byService[o.service]) byService[o.service] = { count: 0, total: 0, meters: 0 };
      byService[o.service].count++;
      byService[o.service].total += o.total_amount;
      byService[o.service].meters += o.meters;
    });

    const maxServiceTotal = Math.max(...Object.values(byService).map((s) => s.total), 1);

    // Orders by day (last 14 days)
    const dayMap: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dayMap[key] = 0;
    }
    orders.forEach((o) => {
      const key = o.created_at.split('T')[0];
      if (key in dayMap) dayMap[key] += o.total_amount;
    });
    const dailyData = Object.entries(dayMap).map(([date, total]) => ({
      date: date.slice(5),
      total,
    }));

    // Service chart data
    const serviceChartData = SERVICE_TYPES
      .filter((s) => byService[s])
      .map((s) => ({
        name: s,
        total: byService[s].total,
        count: byService[s].count,
        color: SERVICE_COLORS[s] || '#888',
      }));

    // Recent activity
    const recentOrders = [...orders]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 6)
      .map((o) => ({
        id: o.id,
        type: 'order' as const,
        client: clientMap[o.client_id]?.name || `#${o.client_id}`,
        service: o.service,
        amount: o.total_amount,
        date: o.created_at,
        isPaid: o.is_paid,
      }));

    const emittedInvoices = invoices.filter((i) => i.status === 'emitted').length;
    const pendingInvoices = invoices.filter((i) => i.status === 'pending').length;

    return {
      unpaidTotal, paidTotal, unpaidCount: unpaid.length, paidCount: paid.length,
      ordersToday: ordersToday.length, totalOrders: orders.length,
      activeClients: clients.filter((c) => c.is_active).length,
      topClients, byService, maxServiceTotal, dailyData, serviceChartData,
      recentOrders, emittedInvoices, pendingInvoices,
    };
  }, [orders, clients, invoices]);

  const chartTooltipStyle = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '0.78rem',
    padding: '0.5rem 0.75rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  };

  if (loading) {
    return (
      <div className="dashboard">
        {/* KPI Cards skeleton */}
        <div className="stat-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`stat-card${i === 0 ? ' accent' : i === 1 ? ' success' : ''}`}>
              <div className="stat-icon"><span className="skeleton-block" style={{ width: 24, height: 24, borderRadius: '50%' }} /></div>
              <div className="stat-content">
                <span className="skeleton-block" style={{ width: '55%', height: 11 }} />
                <span className="skeleton-block" style={{ width: '70%', height: 30, marginTop: 2 }} />
                <span className="skeleton-block" style={{ width: '60%', height: 12, marginTop: 2 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Charts row skeleton */}
        <div className="dashboard-grid">
          {[0, 1].map((i) => (
            <div key={i} className="dash-panel">
              <div className="panel-header">
                <span className="skeleton-block" style={{ width: '40%', height: 12 }} />
              </div>
              <div className="chart-container">
                <span className="skeleton-block" style={{ width: '100%', height: 220 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row skeleton */}
        <div className="dashboard-grid-3">
          {/* Service breakdown */}
          <div className="dash-panel">
            <div className="panel-header">
              <span className="skeleton-block" style={{ width: '50%', height: 12 }} />
            </div>
            <div className="service-breakdown">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="sb-row">
                  <div className="sb-top">
                    <span className="skeleton-block sb-dot" />
                    <span className="skeleton-block" style={{ width: '30%', height: 13 }} />
                    <span className="skeleton-block" style={{ width: '20%', height: 12, marginLeft: 'auto' }} />
                    <span className="skeleton-block" style={{ width: 70, height: 13, flexShrink: 0 }} />
                  </div>
                  <div className="sb-bar-track">
                    <span className="skeleton-block" style={{ width: `${70 - i * 15}%`, height: 6, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top clients */}
          <div className="dash-panel">
            <div className="panel-header">
              <span className="skeleton-block" style={{ width: '40%', height: 12 }} />
            </div>
            <div className="top-clients">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="tc-row">
                  <span className="skeleton-block tc-rank" />
                  <div className="tc-info">
                    <span className="skeleton-block" style={{ width: '65%', height: 14 }} />
                    <span className="skeleton-block" style={{ width: '40%', height: 11 }} />
                  </div>
                  <span className="skeleton-block" style={{ width: 70, height: 14, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="dash-panel">
            <div className="panel-header">
              <span className="skeleton-block" style={{ width: '45%', height: 12 }} />
            </div>
            <div className="activity-feed">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="af-row">
                  <span className="skeleton-block af-dot" />
                  <div className="af-content">
                    <span className="skeleton-block" style={{ width: '75%', height: 13 }} />
                    <span className="skeleton-block" style={{ width: '45%', height: 11 }} />
                  </div>
                  <div className="af-right">
                    <span className="skeleton-block" style={{ width: 60, height: 13 }} />
                    <span className="skeleton-block" style={{ width: 40, height: 10 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions skeleton */}
        <div className="quick-actions">
          <span className="skeleton-block" style={{ width: 130, height: 36, borderRadius: 6 }} />
          <span className="skeleton-block" style={{ width: 110, height: 36, borderRadius: 6 }} />
          <span className="skeleton-block" style={{ width: 110, height: 36, borderRadius: 6 }} />
          <span className="skeleton-block" style={{ width: 110, height: 36, borderRadius: 6 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard fade-in">
      {/* KPI Cards */}
      <div className="stat-grid">
        <div className="stat-card accent">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <span className="stat-label">Por cobrar</span>
            <span className="stat-value">{formatCLP(stats.unpaidTotal)}</span>
            <span className="stat-sub">{stats.unpaidCount} órdenes pendientes</span>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-label">Cobrado</span>
            <span className="stat-value">{formatCLP(stats.paidTotal)}</span>
            <span className="stat-sub">{stats.paidCount} órdenes pagadas</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <span className="stat-label">Órdenes hoy</span>
            <span className="stat-value">{stats.ordersToday}</span>
            <span className="stat-sub">{stats.totalOrders} total</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🧾</div>
          <div className="stat-content">
            <span className="stat-label">Facturas</span>
            <span className="stat-value">{stats.emittedInvoices}</span>
            <span className="stat-sub">{stats.pendingInvoices} pendientes</span>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="dashboard-grid">
        {/* Revenue trend */}
        <div className="dash-panel">
          <div className="panel-header">
            <h3>Ingresos últimos 14 días</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [formatCLP(Number(value)), 'Ingresos']} labelStyle={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }} />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: '#6366f1', stroke: '#000', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by service */}
        <div className="dash-panel">
          <div className="panel-header">
            <h3>Ingresos por servicio</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.serviceChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barCategoryGap="25%">
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [formatCLP(Number(value)), 'Ingresos']} labelStyle={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {stats.serviceChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom row: Service breakdown + Top clients + Recent */}
      <div className="dashboard-grid-3">
        {/* Service breakdown with progress bars */}
        <div className="dash-panel">
          <div className="panel-header">
            <h3>Desglose por servicio</h3>
          </div>
          <div className="service-breakdown">
            {SERVICE_TYPES.map((s) => {
              const data = stats.byService[s];
              if (!data) return null;
              const pct = (data.total / stats.maxServiceTotal) * 100;
              return (
                <div key={s} className="sb-row">
                  <div className="sb-top">
                    <span className="sb-dot" style={{ background: SERVICE_COLORS[s] }} />
                    <span className="sb-name">{s}</span>
                    <span className="sb-count">{data.count} órdenes</span>
                    <span className="sb-total">{formatCLP(data.total)}</span>
                  </div>
                  <div className="sb-bar-track">
                    <div className="sb-bar-fill" style={{ width: `${pct}%`, background: SERVICE_COLORS[s] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top clients */}
        <div className="dash-panel">
          <div className="panel-header">
            <h3>Top clientes</h3>
          </div>
          {stats.topClients.length === 0 && <p className="empty-text">Sin órdenes aún</p>}
          <div className="top-clients">
            {stats.topClients.map((c, i) => (
              <div key={i} className="tc-row">
                <span className={`tc-rank tc-rank-${i + 1}`}>{i + 1}</span>
                <div className="tc-info">
                  <span className="tc-name">{c.name}</span>
                  <span className="tc-meta">{c.count} órdenes</span>
                </div>
                <span className="tc-total">{formatCLP(c.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="dash-panel">
          <div className="panel-header">
            <h3>Actividad reciente</h3>
          </div>
          <div className="activity-feed">
            {stats.recentOrders.map((item) => (
              <div key={item.id} className="af-row">
                <span className={`af-dot af-dot-${item.isPaid ? 'paid' : 'unpaid'}`} />
                <div className="af-content">
                  <span className="af-title">Orden #{item.id} — {item.service}</span>
                  <span className="af-client">{item.client}</span>
                </div>
                <div className="af-right">
                  <span className="af-amount">{formatCLP(item.amount)}</span>
                  <span className="af-date">{formatDateShort(item.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <button className="btn-primary" onClick={() => onNavigate('new-order')}>＋ Nueva Orden</button>
        <button className="btn-secondary" onClick={() => onNavigate('orders')}>Ver Órdenes</button>
        <button className="btn-secondary" onClick={() => onNavigate('clients')}>Ver Clientes</button>
        <button className="btn-secondary" onClick={() => onNavigate('facturacion')}>Ver Facturas</button>
      </div>
    </div>
  );
}
