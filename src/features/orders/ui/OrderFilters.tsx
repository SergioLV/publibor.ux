import type { Client } from '../../clients/model/types';
import { SERVICE_TYPES } from '../../../shared/types';

interface OrderFiltersProps {
  filterClient: string;
  filterService: string;
  filterPayment: 'unpaid' | 'paid' | 'all';
  filterDateFrom: string;
  filterDateTo: string;
  showFilters: boolean;
  clients: Client[];
  userRole?: string;
  onFilterClientChange: (v: string) => void;
  onFilterServiceChange: (v: string) => void;
  onFilterPaymentChange: (v: 'unpaid' | 'paid' | 'all') => void;
  onFilterDateFromChange: (v: string) => void;
  onFilterDateToChange: (v: string) => void;
  onToggleFilters: () => void;
  onClear: () => void;
}

export default function OrderFilters({
  filterClient, filterService, filterPayment, filterDateFrom, filterDateTo,
  showFilters, clients, userRole,
  onFilterClientChange, onFilterServiceChange, onFilterPaymentChange,
  onFilterDateFromChange, onFilterDateToChange, onToggleFilters, onClear,
}: OrderFiltersProps) {
  return (
    <>
      <button className="mobile-filter-toggle" onClick={onToggleFilters}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        Filtros
        <svg className={`mft-chevron ${showFilters ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div className={`order-filters ${showFilters ? 'filters-open' : ''}`}>
        <label>Cliente
          <select value={filterClient} onChange={(e) => onFilterClientChange(e.target.value)}>
            <option value="">Todos</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Servicio
          <select value={filterService} onChange={(e) => onFilterServiceChange(e.target.value)}>
            <option value="">Todos</option>
            {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        {userRole !== 'operator' && (
        <label>Pago
          <select value={filterPayment} onChange={(e) => onFilterPaymentChange(e.target.value as 'unpaid' | 'paid' | 'all')}>
            <option value="unpaid">No pagadas</option>
            <option value="paid">Pagadas</option>
            <option value="all">Todas</option>
          </select>
        </label>
        )}
        <label>Desde
          <input type="date" value={filterDateFrom} onChange={(e) => onFilterDateFromChange(e.target.value)} />
        </label>
        <label>Hasta
          <input type="date" value={filterDateTo} onChange={(e) => onFilterDateToChange(e.target.value)} />
        </label>
        <button className="btn-sm" onClick={onClear}>Limpiar</button>
      </div>
    </>
  );
}
