import { useState } from 'react';
import { icons } from './icons';
import type { AuthUser } from '../../features/auth';

type View = 'dashboard' | 'clients' | 'new-order' | 'orders' | 'prices' | 'facturacion';

const VIEW_TITLES: Record<View, string> = {
  dashboard: 'Dashboard', clients: 'Clientes', 'new-order': 'Nueva Orden',
  orders: 'Órdenes', prices: 'Precios', facturacion: 'Facturación',
};
const VIEW_DESCS: Record<View, string> = {
  dashboard: 'Resumen general', clients: 'Gestión de clientes', 'new-order': 'Crear orden de servicio',
  orders: 'Historial de órdenes', prices: 'Precios por defecto', facturacion: 'Documentos tributarios electrónicos',
};

interface Props {
  view: View;
  user: AuthUser | null;
  theme: 'dark' | 'light';
  userMenuOpen: boolean;
  isOperator: boolean;
  onNavigate: (v: View) => void;
  onMobileMenuToggle: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  onUserMenuToggle: () => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}

export default function Topbar({ view, user, theme, userMenuOpen, isOperator, onNavigate, onMobileMenuToggle, onToggleTheme, onLogout, onUserMenuToggle, searchRef }: Props) {
  const [searchFocused, setSearchFocused] = useState(false);
  const initials = user ? user.username.slice(0, 2).toUpperCase() : 'PB';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu-btn" onClick={onMobileMenuToggle} aria-label="Menú">{icons.menu}</button>
        <div className="topbar-title-group">
          <h1 className="topbar-title">{VIEW_TITLES[view]}</h1>
          <span className="topbar-subtitle">{VIEW_DESCS[view]}</span>
        </div>
      </div>
      <div className="topbar-center">
        <div className={`search-box${searchFocused ? ' focused' : ''}`}>
          <span className="search-icon">{icons.search}</span>
          <input ref={searchRef} type="text" placeholder="Buscar..." className="search-input" onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
          <kbd className="search-kbd">⌘K</kbd>
        </div>
      </div>
      <div className="topbar-right">
        {view !== 'new-order' && (
          <button className="btn-primary topbar-cta" onClick={() => onNavigate('new-order')}>{icons.plus}<span>Nueva Orden</span></button>
        )}
        <button className="topbar-icon-btn" aria-label="Notificaciones" title="Notificaciones">{icons.bell}</button>
        <div className="topbar-avatar-wrap">
          <div className="topbar-avatar" title={user?.username ?? 'Mi cuenta'} onClick={onUserMenuToggle}>
            <span className="avatar-initials">{initials}</span>
          </div>
          {userMenuOpen && (
            <>
              <div className="user-menu-backdrop" onClick={onUserMenuToggle} />
              <div className="user-menu">
                <div className="user-menu-header">
                  <div className="user-menu-avatar"><span>{initials}</span></div>
                  <div className="user-menu-info">
                    <span className="user-menu-name">{user?.username ?? 'Usuario'}</span>
                    <span className="user-menu-role">{isOperator ? 'Operador' : 'Administrador'}</span>
                  </div>
                </div>
                <div className="user-menu-plan">
                  <span className={`user-menu-plan-badge ${isOperator ? 'plan-solo' : 'plan-full'}`}>{isOperator ? 'Solo Plataforma' : 'Plataforma'}</span>
                  <span className="user-menu-plan-desc">{isOperator ? 'Gestión de órdenes' : 'Gestión + Facturación electrónica'}</span>
                </div>
                <div className="user-menu-divider" />
                <button className="user-menu-item" onClick={() => { onUserMenuToggle(); onToggleTheme(); }}>
                  <span className="user-menu-item-icon">{theme === 'dark' ? icons.sun : icons.moon}</span>
                  {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                </button>
                <button className="user-menu-item user-menu-logout" onClick={() => { onUserMenuToggle(); onLogout(); }}>
                  <span className="user-menu-item-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
