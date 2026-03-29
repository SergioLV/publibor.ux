import { useMemo } from 'react';
import { useClients } from '../../clients';
import type { Client } from '../../clients';
import { useOrders } from '../../orders';
import type { Order } from '../../orders';
import { useInvoices } from '../../invoices';
import type { Invoice } from '../../invoices';
import { SERVICE_TYPES } from '../../../shared/types';
import DashboardSkeleton from './DashboardSkeleton';
import KPICards from './KPICards';
import RevenueChart from './RevenueChart';
import ServiceChart from './ServiceChart';
import ServiceBreakdown from './ServiceBreakdown';
import TopClients from './TopClients';
import ActivityFeed from './ActivityFeed';
import './Dashboard.css';

const SERVICE_COLORS: Record<string, string> = {
  DTF: '#818cf8', SUBLIMACION: '#f472b6', UV: '#38bdf8', TEXTURIZADO: '#fbbf24',
};

interface Props {
  onNavigate: (view: string) => void;
}

export default function DashboardPage({ onNavigate }: Props) {
  const { data: clientsData, isLoading: lc } = useClients({ limit: 100 });
  const { data: ordersData, isLoading: lo } = useOrders({ limit: 100 });
  const { data: invoicesData, isLoading: li } = useInvoices();

  const orders = ordersData?.orders ?? [];
  const clients = clientsData?.clients ?? [];
  const invoices = invoicesData ?? [];
  const loading = lc || lo || li;

  const stats = useMemo(() => {
    const unpaid = orders.filter((o: Order) => !o.is_paid);
    const unpaidTotal = unpaid.reduce((s: number, o: Order) => s + o.total_amount, 0);
    const paid = orders.filter((o: Order) => o.is_paid);
    const paidTotal = paid.reduce((s: number, o: Order) => s + o.total_amount, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ordersToday = orders.filter((o: Order) => new Date(o.created_at) >= today);

    const clientOrders: Record<string, { count: number; total: number }> = {};
    orders.forEach((o: Order) => {
      if (!clientOrders[o.client_id]) clientOrders[o.client_id] = { count: 0, total: 0 };
      clientOrders[o.client_id].count++;
      clientOrders[o.client_id].total += o.total_amount;
    });
    const clientMap = Object.fromEntries(clients.map((c: Client) => [c.id, c]));
    const topClients = Object.entries(clientOrders)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([id, data]) => ({ name: clientMap[id]?.name || '—', count: data.count, total: data.total }));

    const byService: Record<string, { count: number; total: number; meters: number }> = {};
    orders.forEach((o: Order) => {
      if (!byService[o.service]) byService[o.service] = { count: 0, total: 0, meters: 0 };
      byService[o.service].count++;
      byService[o.service].total += o.total_amount;
      byService[o.service].meters += o.meters;
    });
    const maxServiceTotal = Math.max(...Object.values(byService).map((s) => s.total), 1);

    const dayMap: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dayMap[d.toISOString().split('T')[0]] = 0;
    }
    orders.forEach((o: Order) => { const k = o.created_at.split('T')[0]; if (k in dayMap) dayMap[k] += o.total_amount; });
    const dailyData = Object.entries(dayMap).map(([date, total]) => ({ date: date.slice(5), total }));

    const serviceChartData = SERVICE_TYPES
      .filter((s) => byService[s])
      .map((s) => ({ name: s, total: byService[s].total, count: byService[s].count, color: SERVICE_COLORS[s] || '#888' }));

    const recentOrders = [...orders]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 6)
      .map((o: Order) => ({
        id: o.id, client: clientMap[o.client_id]?.name || `#${o.client_id}`,
        service: o.service, amount: o.total_amount, date: o.created_at, isPaid: o.is_paid,
      }));

    return {
      unpaidTotal, paidTotal, unpaidCount: unpaid.length, paidCount: paid.length,
      ordersToday: ordersToday.length, totalOrders: orders.length,
      activeClients: clients.filter((c: Client) => c.is_active).length,
      topClients, byService, maxServiceTotal, dailyData, serviceChartData, recentOrders,
      emittedInvoices: invoices.filter((i: Invoice) => i.status === 'emitted').length,
      pendingInvoices: invoices.filter((i: Invoice) => i.status === 'pending').length,
    };
  }, [orders, clients, invoices]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="dashboard fade-in">
      <KPICards
        unpaidTotal={stats.unpaidTotal} unpaidCount={stats.unpaidCount}
        paidTotal={stats.paidTotal} paidCount={stats.paidCount}
        ordersToday={stats.ordersToday} totalOrders={stats.totalOrders}
        emittedInvoices={stats.emittedInvoices} pendingInvoices={stats.pendingInvoices}
      />
      <div className="dashboard-grid">
        <RevenueChart data={stats.dailyData} />
        <ServiceChart data={stats.serviceChartData} />
      </div>
      <div className="dashboard-grid-3">
        <ServiceBreakdown byService={stats.byService} maxServiceTotal={stats.maxServiceTotal} />
        <TopClients clients={stats.topClients} />
        <ActivityFeed items={stats.recentOrders} />
      </div>
      <div className="quick-actions">
        <button className="btn-primary" onClick={() => onNavigate('new-order')}>＋ Nueva Orden</button>
        <button className="btn-secondary" onClick={() => onNavigate('orders')}>Ver Órdenes</button>
        <button className="btn-secondary" onClick={() => onNavigate('clients')}>Ver Clientes</button>
        <button className="btn-secondary" onClick={() => onNavigate('facturacion')}>Ver Facturas</button>
      </div>
    </div>
  );
}
