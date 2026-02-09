import { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import ClientList from './components/ClientList';
import NewOrder from './components/NewOrder';
import OrderList from './components/OrderList';
import Prices from './components/Prices';

type View = 'dashboard' | 'clients' | 'new-order' | 'orders' | 'prices';

function App() {
  const [view, setView] = useState<View>(() => {
    const saved = localStorage.getItem('publibor-view') as View | null;
    return saved && ['dashboard', 'clients', 'new-order', 'orders', 'prices'].includes(saved) ? saved : 'dashboard';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('publibor-theme') as 'dark' | 'light') || 'light';
  });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('publibor-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  function navigate(v: View) {
    setView(v);
    localStorage.setItem('publibor-view', v);
    setMobileOpen(false);
  }

  const navItems: { key: View; icon: string; label: string }[] = [
    { key: 'dashboard', icon: '📊', label: 'Dashboard' },
    { key: 'clients', icon: '👥', label: 'Clientes' },
    { key: 'new-order', icon: '➕', label: 'Nueva Orden' },
    { key: 'orders', icon: '📋', label: 'Órdenes' },
    { key: 'prices', icon: '💲', label: 'Precios' },
  ];

  const viewMeta: Record<View, { label: string; icon: string; description: string }> = {
    dashboard: { label: 'Dashboard', icon: '📊', description: 'Resumen general' },
    clients: { label: 'Clientes', icon: '👥', description: 'Gestión de clientes' },
    'new-order': { label: 'Nueva Orden', icon: '➕', description: 'Crear orden de servicio' },
    orders: { label: 'Órdenes', icon: '📋', description: 'Historial de órdenes' },
    prices: { label: 'Precios', icon: '💲', description: 'Precios por defecto' },
  };

  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          {!collapsed && <div className="brand-text"><span className="brand-name">Publibor</span><span className="brand-desc">Software de gestión</span></div>}
          <button className="collapse-btn" onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }} aria-label="Toggle sidebar">
            {collapsed ? '▸' : '◂'}
          </button>
        </div>
        <ul className="sidebar-nav">
          {navItems.map((item) => (
            <li key={item.key}>
              <a href="#" className={view === item.key ? 'active' : ''} onClick={(e) => { e.preventDefault(); navigate(item.key); }} title={item.label}>
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </a>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Cambiar tema" title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            <span className="theme-icon">{theme === 'dark' ? '☀' : '☾'}</span>
            {!collapsed && <span className="theme-label">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>}
          </button>
        </div>
      </aside>
      <main className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menú">
              ☰
            </button>
            <div className="breadcrumb">
              <span className="breadcrumb-icon">{viewMeta[view].icon}</span>
              <div className="breadcrumb-text">
                <span className="breadcrumb-title">{viewMeta[view].label}</span>
                <span className="breadcrumb-desc">{viewMeta[view].description}</span>
              </div>
            </div>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{today}</span>
            {view !== 'new-order' && (
              <button className="btn-primary topbar-action" onClick={() => navigate('new-order')}>+ Nueva Orden</button>
            )}
          </div>
        </div>
        <div className="page-content">
          {view === 'dashboard' && <Dashboard onNavigate={(v) => navigate(v as View)} />}
          {view === 'clients' && <ClientList />}
          {view === 'new-order' && <NewOrder onNavigate={(v) => navigate(v as View)} />}
          {view === 'orders' && <OrderList />}
          {view === 'prices' && <Prices />}
        </div>
      </main>
    </>
  );
}

export default App;
