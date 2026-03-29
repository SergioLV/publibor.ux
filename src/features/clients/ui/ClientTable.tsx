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

export default function ClientTable({ clients, loading, search, onEdit, onNew }: Props) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Cliente</th><th>RUT</th><th>Email</th><th>Teléfono</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <tr key={`skel-${i}`} className="skeleton-row" style={{ animationDelay: `${i * 0.04}s` }}>
              <td><div className="cl-name-cell"><span className="skeleton-cell cl-avatar-sk" /><span className="skeleton-cell wide" /></div></td>
              <td><span className="skeleton-cell medium" /></td>
              <td><span className="skeleton-cell wide" /></td>
              <td><span className="skeleton-cell medium" /></td>
              <td><span className="skeleton-cell tiny" /></td>
              <td><span className="skeleton-cell tiny" /></td>
            </tr>
          ))}
          {!loading && clients.map((c, idx) => (
            <tr key={c.id} className="fade-in-row clickable-row" style={{ animationDelay: `${idx * 0.02}s` }} onClick={() => onEdit(c)}>
              <td><div className="cl-name-cell"><span className="cl-avatar">{clientInitials(c.name)}</span><span className="cl-name">{c.name}</span></div></td>
              <td>{c.rut ? <span className="cl-mono">{c.rut}</span> : <span className="cl-empty">Sin RUT</span>}</td>
              <td>{c.email ? <span className="cl-email">{c.email}</span> : <span className="cl-empty">Sin email</span>}</td>
              <td>{c.phone ? <span className="cl-mono">{c.phone}</span> : <span className="cl-empty">Sin teléfono</span>}</td>
              <td><span className={`status-badge ${c.is_active ? 'active' : 'inactive'}`}>{c.is_active ? 'Activo' : 'Inactivo'}</span></td>
              <td>
                <button className="btn-action" onClick={() => onEdit(c)} title="Editar cliente">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </td>
            </tr>
          ))}
          {!loading && clients.length === 0 && (
            <tr><td colSpan={6}>
              <div className="cl-empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span className="cl-empty-title">Sin clientes</span>
                <span className="cl-empty-desc">{search ? 'No se encontraron resultados para tu búsqueda' : 'Agrega tu primer cliente para comenzar'}</span>
                {!search && <button className="btn-primary cl-empty-btn" onClick={onNew}>+ Nuevo Cliente</button>}
              </div>
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
