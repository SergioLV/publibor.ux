interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  showAll: boolean;
  onShowAllChange: (v: boolean) => void;
  onNewClient: () => void;
}

export default function ClientToolbar({ search, onSearchChange, showAll, onShowAllChange, onNewClient }: Props) {
  return (
    <div className="client-toolbar">
      <div className="ct-search-wrap">
        <svg className="ct-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" placeholder="Buscar por nombre o RUT..." value={search} onChange={(e) => onSearchChange(e.target.value)} />
      </div>
      <label className="ct-toggle">
        <input type="checkbox" checked={showAll} onChange={(e) => onShowAllChange(e.target.checked)} />
        <span>Mostrar inactivos</span>
      </label>
      <button className="btn-primary" onClick={onNewClient}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        Nuevo Cliente
      </button>
    </div>
  );
}
