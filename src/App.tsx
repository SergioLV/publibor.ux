import { useState, useEffect, useRef } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import ClientList from './components/ClientList';
import NewOrder from './components/NewOrder';
import OrderList from './components/OrderList';
import Prices from './components/Prices';
import Facturacion from './components/Facturacion';
import Login from './components/Login';
import { getAuthToken, clearAuthToken, apiGetMe } from './data/api';
import type { AuthUser } from './data/api';

type View = 'dashboard' | 'clients' | 'new-order' | 'orders' | 'prices' | 'facturacion';

/* ── SVG Icons (Lucide-style, 20×20) ── */
const icons: Record<string, React.ReactNode> = {
  dashboard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  clients: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  'new-order': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>,
  orders: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>,
  prices: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  facturacion: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v.5"/><path d="M12 6v.5"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  bell: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  sun: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
  moon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>,
  chevron: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>,
};

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [view, setView] = useState<View>(() => {
    const saved = localStorage.getItem('publibor-view') as View | null;
    return saved && ['dashboard', 'clients', 'new-order', 'orders', 'prices', 'facturacion'].includes(saved) ? saved : 'dashboard';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('publibor-theme') as 'dark' | 'light') || 'light';
  });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('publibor-theme', theme);
  }, [theme]);

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auth check on mount
  useEffect(() => {
    const token = getAuthToken();
    if (!token) { setAuthed(false); return; }
    apiGetMe()
      .then((u) => { setUser(u); setAuthed(true); })
      .catch(() => { clearAuthToken(); setAuthed(false); });
  }, []);

  function handleLogin() {
    apiGetMe()
      .then((u) => {
        setUser(u);
        setAuthed(true);
        if (u.role === 'operator') {
          setView('orders');
          localStorage.setItem('publibor-view', 'orders');
        }
      })
      .catch(() => setAuthed(true));
  }

  function handleLogout() {
    clearAuthToken();
    setUser(null);
    setAuthed(false);
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  function navigate(v: View) {
    setView(v);
    localStorage.setItem('publibor-view', v);
    setMobileOpen(false);
  }

  const isOperator = user?.role === 'operator';

  const mainNav: { key: View; label: string }[] = isOperator
    ? [
        { key: 'orders', label: 'Órdenes' },
        { key: 'new-order', label: 'Nueva Orden' },
      ]
    : [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'orders', label: 'Órdenes' },
        { key: 'clients', label: 'Clientes' },
        { key: 'facturacion', label: 'Facturación' },
      ];

  const configNav: { key: View; label: string }[] = isOperator
    ? []
    : [{ key: 'prices', label: 'Precios' }];

  const viewTitles: Record<View, string> = {
    dashboard: 'Dashboard',
    clients: 'Clientes',
    'new-order': 'Nueva Orden',
    orders: 'Órdenes',
    prices: 'Precios',
    facturacion: 'Facturación',
  };

  const viewDescriptions: Record<View, string> = {
    dashboard: 'Resumen general',
    clients: 'Gestión de clientes',
    'new-order': 'Crear orden de servicio',
    orders: 'Historial de órdenes',
    prices: 'Precios por defecto',
    facturacion: 'Documentos tributarios electrónicos',
  };

  // Auth gate: loading
  if (authed === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#000' }}>P</span>
        </div>
        <span style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--color-text)' }}>PUBLIBOR</span>
      </div>
    );
  }

  // Auth gate: not logged in
  if (!authed) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">
            <span className="brand-mark">P</span>
          </div>
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-name">Publibor</span>
              <span className="brand-desc">Software de gestión</span>
            </div>
          )}
          <button className="collapse-btn" onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }} aria-label="Toggle sidebar">
            <span className={`collapse-icon${collapsed ? ' rotated' : ''}`}>{icons.chevron}</span>
          </button>
        </div>

        {/* New order CTA in sidebar */}
        {!collapsed && (
          <div className="sidebar-cta">
            <button className="btn-cta" onClick={() => navigate('new-order')}>
              {icons.plus}
              <span>Nueva Orden</span>
            </button>
          </div>
        )}
        {collapsed && (
          <div className="sidebar-cta collapsed-cta">
            <button className="btn-cta-icon" onClick={() => navigate('new-order')} title="Nueva Orden">
              {icons.plus}
            </button>
          </div>
        )}

        <nav className="sidebar-nav">
          <div className="nav-section">
            {!collapsed && <span className="nav-section-label">General</span>}
            <ul>
              {mainNav.map((item) => (
                <li key={item.key}>
                  <a
                    href="#"
                    className={view === item.key ? 'active' : ''}
                    onClick={(e) => { e.preventDefault(); navigate(item.key); }}
                    title={item.label}
                  >
                    <span className="nav-icon">{icons[item.key]}</span>
                    {!collapsed && <span className="nav-label">{item.label}</span>}
                    {view === item.key && <span className="nav-indicator" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {configNav.length > 0 && (
            <div className="nav-section">
              {!collapsed && <span className="nav-section-label">Configuración</span>}
              <ul>
                {configNav.map((item) => (
                  <li key={item.key}>
                    <a
                      href="#"
                      className={view === item.key ? 'active' : ''}
                      onClick={(e) => { e.preventDefault(); navigate(item.key); }}
                      title={item.label}
                    >
                      <span className="nav-icon">{icons[item.key]}</span>
                      {!collapsed && <span className="nav-label">{item.label}</span>}
                      {view === item.key && <span className="nav-indicator" />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            <span className="theme-icon-wrap">
              {theme === 'dark' ? icons.sun : icons.moon}
            </span>
            {!collapsed && <span className="theme-label">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>}
          </button>
          <button className="theme-toggle logout-btn" onClick={handleLogout} title="Cerrar sesión">
            <span className="theme-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </span>
            {!collapsed && <span className="theme-label">Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menú">
              {icons.menu}
            </button>
            <div className="topbar-title-group">
              <h1 className="topbar-title">{viewTitles[view]}</h1>
              <span className="topbar-subtitle">{viewDescriptions[view]}</span>
            </div>
          </div>

          <div className="topbar-center">
            <div className={`search-box${searchFocused ? ' focused' : ''}`}>
              <span className="search-icon">{icons.search}</span>
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar..."
                className="search-input"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              <kbd className="search-kbd">⌘K</kbd>
            </div>
          </div>

          <div className="topbar-right">
            {view !== 'new-order' && (
              <button className="btn-primary topbar-cta" onClick={() => navigate('new-order')}>
                {icons.plus}
                <span>Nueva Orden</span>
              </button>
            )}
            <button className="topbar-icon-btn" aria-label="Notificaciones" title="Notificaciones">
              {icons.bell}
            </button>
            <div className="topbar-avatar" title={user?.username ?? 'Mi cuenta'}>
              <span className="avatar-initials">{user ? user.username.slice(0, 2).toUpperCase() : 'PB'}</span>
            </div>
          </div>
        </header>

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
