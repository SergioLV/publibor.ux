import type { Client } from '../model/types';

function clientInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

interface Props {
  clients: Client[];
  loading: boolean;
  search: string;
  onEdit: (c: Client) => void;
  onNew: () => void;
}

export default function ClientMobileCards({ clients, loading, search, onEdit, onNew }: Props) {
  return (
    <div className="mobile-client-cards">
      {loading && Array.from({ length: 4 }).map((_, i) => (
        <div key={`cskel-${i}`} className="mobile-client-card skeleton-card" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="skeleton-cell wide" /><div className="skeleton-cell medium" /><div className="skeleton-cell short" />
        </div>
      ))}
      {!loading && clients.map((c, idx) => (
        <div key={c.id} className="mobile-client-card fade-in-row" style={{ animationDelay: `${idx * 0.03}s` }} onClick={() => onEdit(c)}>
          <div className="mcc-top">
            <span className="cl-avatar">{clientInitials(c.name)}</span>
            <div className="mcc-info"><span className="mcc-name">{c.name}</span>{c.rut && <span className="mcc-rut">{c.rut}</span>}</div>
            <span className={`status-badge ${c.is_active ? 'active' : 'inactive'}`}>{c.is_active ? 'Activo' : 'Inactivo'}</span>
          </div>
          <div className="mcc-details">
            {c.email && <div className="mcc-detail"><span className="mcc-label">Email</span><span>{c.email}</span></div>}
            {c.phone && <div className="mcc-detail"><span className="mcc-label">Teléfono</span><span>{c.phone}</span></div>}
            {!c.email && !c.phone && <span className="mcc-no-contact">Sin datos de contacto</span>}
          </div>
        </div>
      ))}
      {!loading && clients.length === 0 && (
        <div className="mcc-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span className="cl-empty-title">Sin clientes</span>
          <span className="cl-empty-desc">{search ? 'No se encontraron resultados' : 'Agrega tu primer cliente'}</span>
          {!search && <button className="btn-primary cl-empty-btn" onClick={onNew}>+ Nuevo Cliente</button>}
        </div>
      )}
    </div>
  );
}
