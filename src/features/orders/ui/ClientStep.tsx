import type { Client } from '../../clients/model/types';

function clientInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

interface Props {
  active: boolean;
  clientId: string;
  clientSearch: string;
  selectedClient: Client | null;
  filteredClients: Client[];
  showDropdown: boolean;
  loadingClients: boolean;
  onSearchChange: (v: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSelect: (id: string, name: string) => void;
  onClear: () => void;
}

export default function ClientStep({ active, clientId, clientSearch, selectedClient, filteredClients, showDropdown, loadingClients, onSearchChange, onFocus, onBlur, onSelect, onClear }: Props) {
  if (active) {
    return (
      <div className="no-card card-active card-enter">
        <div className="no-card-head">
          <span className="no-card-num">1</span>
          <span className="no-card-title title-active">Seleccionar cliente</span>
        </div>
        <div className="dropdown-wrap">
          <div className="input-search-wrap">
            <input type="text" placeholder="Buscar por nombre o RUT..." value={clientSearch} onChange={(e) => onSearchChange(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
            {loadingClients && <span className="input-spinner" />}
          </div>
          {showDropdown && !loadingClients && filteredClients.length > 0 && (
            <ul className="dropdown-list">
              {filteredClients.map((c) => (
                <li key={c.id} onMouseDown={(e) => { e.preventDefault(); onSelect(c.id, c.name); }}>
                  <span className="dd-name">{c.name}</span>
                  {c.rut && <span className="dd-rut">{c.rut}</span>}
                </li>
              ))}
            </ul>
          )}
          {showDropdown && loadingClients && (
            <div className="dropdown-skeleton">
              {[1, 2, 3].map((i) => (<div key={i} className="dd-skeleton-row"><div className="dd-sk-name skeleton-block" /><div className="dd-sk-rut skeleton-block" /></div>))}
            </div>
          )}
        </div>
        {!clientSearch && filteredClients.length > 0 && (
          <div className="freq-clients">
            <span className="freq-label">Recientes</span>
            {filteredClients.slice(0, 6).map((c) => (
              <button key={c.id} className="freq-chip" onClick={() => onSelect(c.id, c.name)}>{c.name}</button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (clientId && selectedClient) {
    return (
      <div className="no-card card-collapsed" onClick={onClear}>
        <div className="collapsed-row">
          <span className="no-card-num">✓</span>
          <span className="collapsed-label">Cliente</span>
          <div className="collapsed-value">
            <span className="cb-avatar cb-avatar-sm">{clientInitials(selectedClient.name)}</span>
            <span>{selectedClient.name}</span>
          </div>
          <button className="collapsed-change" onClick={(e) => { e.stopPropagation(); onClear(); }}>Cambiar</button>
        </div>
      </div>
    );
  }

  return null;
}
