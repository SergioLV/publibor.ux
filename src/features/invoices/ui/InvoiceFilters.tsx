import type { InvoiceStatus } from '../model/types';

interface Props {
  filterStatus: InvoiceStatus | '';
  onFilterChange: (s: InvoiceStatus | '') => void;
  resultCount: number;
  loading: boolean;
  onRefresh: () => void;
}

export default function InvoiceFilters({ filterStatus, onFilterChange, resultCount, loading, onRefresh }: Props) {
  return (
    <div className="fi-controls">
      <div className="fi-filter-group">
        <button className={`fi-filter-chip ${filterStatus === '' ? 'active' : ''}`} onClick={() => onFilterChange('')}>Todos</button>
        <button className={`fi-filter-chip ${filterStatus === 'emitted' ? 'active' : ''}`} onClick={() => onFilterChange('emitted')}>
          <span className="fi-chip-dot fi-dot-emitted" />Emitidas
        </button>
        <button className={`fi-filter-chip ${filterStatus === 'pending' ? 'active' : ''}`} onClick={() => onFilterChange('pending')}>
          <span className="fi-chip-dot fi-dot-pending" />Pendientes
        </button>
        <button className={`fi-filter-chip ${filterStatus === 'error' ? 'active' : ''}`} onClick={() => onFilterChange('error')}>
          <span className="fi-chip-dot fi-dot-failed" />Error
        </button>
        <button className={`fi-filter-chip ${filterStatus === 'rejected' ? 'active' : ''}`} onClick={() => onFilterChange('rejected')}>
          <span className="fi-chip-dot fi-dot-failed" />Rechazada
        </button>
      </div>
      <div className="fi-controls-right">
        <span className="fi-result-count">{resultCount} resultado{resultCount !== 1 ? 's' : ''}</span>
        <button className="fi-refresh-btn" onClick={onRefresh} disabled={loading}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'fi-spin' : ''}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>
    </div>
  );
}
