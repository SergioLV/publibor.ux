import { icons } from './icons';

type View = 'dashboard' | 'clients' | 'new-order' | 'orders' | 'prices' | 'facturacion';

interface NavItem { key: View; label: string }

interface Props {
  view: View;
  collapsed: boolean;
  mobileOpen: boolean;
  theme: 'dark' | 'light';
  mainNav: NavItem[];
  configNav: NavItem[];
  onNavigate: (v: View) => void;
  onCollapse: () => void;
  onExpand: () => void;
  onMobileClose: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export default function Sidebar({ view, collapsed, mobileOpen, theme, mainNav, configNav, onNavigate, onCollapse, onExpand, onMobileClose, onToggleTheme, onLogout }: Props) {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-logo"><span className="brand-mark">P</span></div>
        {!collapsed && (<div className="brand-text"><span className="brand-name">Publibor</span><span className="brand-desc">Software de gestión</span></div>)}
        <button className="collapse-btn" onClick={() => { window.innerWidth <= 768 ? onMobileClose() : (collapsed ? onExpand() : onCollapse()); }} aria-label="Toggle sidebar">
          <span className={`collapse-icon${collapsed ? ' rotated' : ''}`}>{icons.chevron}</span>
        </button>
      </div>

      {!collapsed ? (
        <div className="sidebar-cta"><button className="btn-cta" onClick={() => onNavigate('new-order')}>{icons.plus}<span>Nueva Orden</span></button></div>
      ) : (
        <div className="sidebar-cta collapsed-cta"><button className="btn-cta-icon" onClick={() => onNavigate('new-order')} title="Nueva Orden">{icons.plus}</button></div>
      )}

      <nav className="sidebar-nav">
        <div className="nav-section">
          {!collapsed && <span className="nav-section-label">General</span>}
          <ul>
            {mainNav.map((item) => (
              <li key={item.key}>
                <a href="#" className={view === item.key ? 'active' : ''} onClick={(e) => { e.preventDefault(); onNavigate(item.key); }} title={item.label}>
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
                  <a href="#" className={view === item.key ? 'active' : ''} onClick={(e) => { e.preventDefault(); onNavigate(item.key); }} title={item.label}>
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
        {collapsed && (
          <button className="expand-btn" onClick={onExpand} aria-label="Expandir menú" title="Expandir menú">
            <span className="collapse-icon" style={{ transform: 'rotate(180deg)' }}>{icons.chevron}</span>
          </button>
        )}
        <button className="theme-toggle" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
          <span className="theme-icon-wrap">{theme === 'dark' ? icons.sun : icons.moon}</span>
          {!collapsed && <span className="theme-label">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>}
        </button>
        <button className="theme-toggle logout-btn" onClick={onLogout} title="Cerrar sesión">
          <span className="theme-icon-wrap"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
          {!collapsed && <span className="theme-label">Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
