import { useState, useEffect, useRef } from 'react';
import './App.css';
import Sidebar from './app/layout/Sidebar';
import Topbar from './app/layout/Topbar';
import Dashboard from './features/dashboard/ui/DashboardPage';
import ClientList from './features/clients/ui/ClientListPage';
import NewOrder from './features/orders/ui/NewOrderPage';
import OrderList from './features/orders/ui/OrderListPage';
import Prices from './features/prices/ui/PricesPage';
import Facturacion from './features/invoices/ui/InvoicesPage';
import Login from './features/auth/ui/LoginPage';
import { getAuthToken, clearAuthToken, apiGetMe } from './features/auth';
import type { AuthUser } from './features/auth';

type View = 'dashboard' | 'clients' | 'new-order' | 'orders' | 'prices' | 'facturacion';

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [view, setView] = useState<View>(() => {
    const saved = localStorage.getItem('raffer-view') as View | null;
    return saved && ['dashboard', 'clients', 'new-order', 'orders', 'prices', 'facturacion'].includes(saved) ? saved : 'dashboard';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('raffer-theme') as 'dark' | 'light') || 'light');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const viewHistory = useRef<View[]>([]);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('raffer-theme', theme); }, [theme]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') {
        if (userMenuOpen) { setUserMenuOpen(false); return; }
        if (mobileOpen) { setMobileOpen(false); return; }
        navigateBack();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [userMenuOpen, mobileOpen, view]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) { setAuthed(false); return; }
    apiGetMe().then((u) => { setUser(u); setAuthed(true); }).catch(() => { clearAuthToken(); setAuthed(false); });
  }, []);

  function handleLogin() {
    apiGetMe().then((u) => {
      setUser(u); setAuthed(true);
      if (u.role === 'operator') { setView('orders'); localStorage.setItem('raffer-view', 'orders'); }
    }).catch(() => setAuthed(true));
  }

  function handleLogout() { clearAuthToken(); setUser(null); setAuthed(false); }
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  function navigate(v: View) {
    if (v !== view) viewHistory.current.push(view);
    setView(v); localStorage.setItem('raffer-view', v); setMobileOpen(false);
  }

  function navigateBack() {
    const prev = viewHistory.current.pop();
    if (prev && prev !== view) { setView(prev); localStorage.setItem('raffer-view', prev); }
  }

  const isOperator = user?.role === 'operator';
  const mainNav = isOperator
    ? [{ key: 'orders' as View, label: 'Órdenes' }, { key: 'new-order' as View, label: 'Nueva Orden' }]
    : [{ key: 'dashboard' as View, label: 'Dashboard' }, { key: 'orders' as View, label: 'Órdenes' }, { key: 'clients' as View, label: 'Clientes' }, { key: 'facturacion' as View, label: 'Facturación' }];
  const configNav = isOperator ? [] : [{ key: 'prices' as View, label: 'Precios' }];

  if (authed === null) {
    return (
      <div className="pb-loading-overlay" style={{ position: 'fixed' }}>
        <div className="pb-loading-content">
          <div className="pb-loading-spinner" />
          <span className="pb-loading-brand">PUBLIBOR</span>
          <span className="pb-loading-text">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!authed) return <Login onLogin={handleLogin} />;

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}
      <Sidebar
        view={view} collapsed={collapsed} mobileOpen={mobileOpen} theme={theme}
        mainNav={mainNav} configNav={configNav}
        onNavigate={navigate} onCollapse={() => setCollapsed(true)} onExpand={() => setCollapsed(false)}
        onMobileClose={() => setMobileOpen(false)} onToggleTheme={toggleTheme} onLogout={handleLogout}
      />
      <main className="main-content">
        <Topbar
          view={view} user={user} theme={theme} userMenuOpen={userMenuOpen} isOperator={isOperator}
          onNavigate={navigate} onMobileMenuToggle={() => { setCollapsed(false); setMobileOpen(o => !o); }}
          onToggleTheme={toggleTheme} onLogout={handleLogout}
          onUserMenuToggle={() => setUserMenuOpen(!userMenuOpen)} searchRef={searchRef}
        />
        <div className="page-content">
          {view === 'dashboard' && <Dashboard onNavigate={(v) => navigate(v as View)} />}
          {view === 'clients' && <ClientList />}
          {view === 'new-order' && <NewOrder onNavigate={(v) => navigate(v as View)} userRole={user?.role} />}
          {view === 'orders' && <OrderList onNavigate={(v) => navigate(v as View)} userRole={user?.role} />}
          {view === 'prices' && <Prices />}
          {view === 'facturacion' && <Facturacion />}
        </div>
      </main>
    </>
  );
}

export default App;
