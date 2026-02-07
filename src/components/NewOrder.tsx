import { useState, useMemo, useEffect } from 'react';
import type { Client, ServiceType } from '../data/types';
import { SERVICE_TYPES } from '../data/types';
import { getEffectivePrice, calculateOrder, createOrder, defaultPrices, getOrders } from '../data/store';
import { fetchClients, fetchClientById } from '../data/api';
import { formatCLP, formatDate } from '../data/format';
import './NewOrder.css';

interface Props {
  onNavigate: (view: string) => void;
}

export default function NewOrder({ onNavigate }: Props) {
  const [activeClients, setActiveClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [service, setService] = useState<ServiceType | ''>('');
  const [meters, setMeters] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

  // Fetch clients for dropdown (search server-side)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!clientSearch && !showDropdown) return;
      setLoadingClients(true);
      try {
        const res = await fetchClients({ search: clientSearch || undefined, active: true, limit: 20 });
        setActiveClients(res.clients);
      } catch {
        // silent — dropdown just won't show
      } finally {
        setLoadingClients(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch, showDropdown]);

  // Fetch selected client details
  useEffect(() => {
    if (!clientId) { setSelectedClient(null); return; }
    fetchClientById(clientId).then(setSelectedClient).catch(() => setSelectedClient(null));
  }, [clientId]);

  const filteredClients = activeClients;

  const calc = useMemo(() => {
    if (!selectedClient || !service || !meters || Number(meters) < 0.1) return null;
    const unitPrice = getEffectivePrice(selectedClient, service as ServiceType);
    if (unitPrice === null) return null;
    const m = Number(meters);
    return { unitPrice, ...calculateOrder(unitPrice, m) };
  }, [selectedClient, service, meters]);

  const priceError = useMemo(() => {
    if (!service) return '';
    if (selectedClient) {
      const price = getEffectivePrice(selectedClient, service as ServiceType);
      if (price === null) return `No hay precio configurado para ${service}`;
    } else {
      const dp = defaultPrices[service as ServiceType];
      if (dp === null) return `No hay precio por defecto para ${service}`;
    }
    return '';
  }, [selectedClient, service]);

  const recentOrders = useMemo(() => {
    if (!clientId) return [];
    return getOrders()
      .filter((o) => o.client_id === clientId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [clientId]);

  function handleSubmit() {
    setError('');
    if (!clientId) { setError('Seleccione un cliente'); return; }
    if (!service) { setError('Seleccione tipo de servicio'); return; }
    if (!meters || Number(meters) < 0.1) { setError('Metros debe ser ≥ 0.1'); return; }
    if (priceError) { setError(priceError); return; }
    if (!calc) return;
    createOrder(clientId, service as ServiceType, Number(meters), calc.unitPrice);
    setSuccess(true);
  }

  function selectClient(id: string, name: string) {
    setClientId(id);
    setClientSearch(name);
    setShowDropdown(false);
  }

  function resetForm() {
    setSuccess(false);
    setClientId('');
    setSelectedClient(null);
    setService('');
    setMeters('');
    setClientSearch('');
    setError('');
  }

  const step = !clientId ? 1 : !service ? 2 : 3;

  if (success) {
    return (
      <div className="no-flow">
        <div className="success-box">
          <div className="success-icon">✓</div>
          <h2>Orden creada</h2>
          <p>La orden ha sido registrada exitosamente.</p>
          <div className="success-actions">
            <button className="btn-primary" onClick={() => onNavigate('orders')}>Ver Órdenes</button>
            <button className="btn-ghost" onClick={resetForm}>Crear otra</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="no-flow">
      {error && <div className="error-msg">{error}</div>}

      <div className="steps">
        <div className={`step ${step >= 1 ? 'active' : ''} ${clientId ? 'done' : ''}`}>
          <span className="step-num">1</span><span className="step-label">Cliente</span>
        </div>
        <div className="step-line" />
        <div className={`step ${step >= 2 ? 'active' : ''} ${service ? 'done' : ''}`}>
          <span className="step-num">2</span><span className="step-label">Servicio</span>
        </div>
        <div className="step-line" />
        <div className={`step ${step >= 3 ? 'active' : ''} ${meters && Number(meters) >= 0.1 ? 'done' : ''}`}>
          <span className="step-num">3</span><span className="step-label">Cantidad</span>
        </div>
      </div>

      <div className="no-card">
        <div className="no-card-head">
          <span className="no-card-num">1</span>
          <span className="no-card-title">Seleccionar cliente</span>
        </div>
        <div className="dropdown-wrap">
          <input
            type="text"
            placeholder="Buscar por nombre o RUT..."
            value={clientSearch}
            onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true); setClientId(''); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          />
          {showDropdown && filteredClients.length > 0 && (
            <ul className="dropdown-list">
              {filteredClients.map((c) => (
                <li key={c.id} onClick={() => selectClient(c.id, c.name)}>
                  <span className="dd-name">{c.name}</span>
                  {c.rut && <span className="dd-rut">{c.rut}</span>}
                </li>
              ))}
            </ul>
          )}
          {showDropdown && loadingClients && <div className="dropdown-loading">Buscando...</div>}
        </div>
        {selectedClient && (
          <div className="client-badge">
            <div className="cb-info">
              <strong>{selectedClient.name}</strong>
              {selectedClient.rut && <span>{selectedClient.rut}</span>}
            </div>
            <div className="cb-prices">
              {SERVICE_TYPES.map((s) => {
                const pref = selectedClient.preferentialPrices[s];
                return (
                  <div key={s} className="cb-price">
                    <span className="cb-service">{s}</span>
                    <span className={pref ? 'cb-val pref' : 'cb-val'}>
                      {formatCLP(pref || defaultPrices[s] || 0)}
                      {pref && <span className="pref-dot" />}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="no-card">
        <div className="no-card-head">
          <span className="no-card-num">2</span>
          <span className="no-card-title">Tipo de servicio</span>
        </div>
        <div className="service-grid">
          {SERVICE_TYPES.map((s) => {
            const effectivePrice = selectedClient
              ? (selectedClient.preferentialPrices[s] || defaultPrices[s])
              : defaultPrices[s];
            return (
              <button
                key={s}
                className={`service-option ${service === s ? 'selected' : ''}`}
                onClick={() => setService(s)}
              >
                <span className="so-name">{s}</span>
                <span className="so-price">{formatCLP(effectivePrice || 0)}/m</span>
              </button>
            );
          })}
        </div>
        {priceError && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{priceError}</div>}
      </div>

      <div className="no-card">
        <div className="no-card-head">
          <span className="no-card-num">3</span>
          <span className="no-card-title">Cantidad en metros</span>
        </div>
        <input
          className="meters-input"
          type="number"
          min="0.1"
          step="0.1"
          value={meters}
          onChange={(e) => setMeters(e.target.value)}
          placeholder="0.0"
        />
      </div>

      {selectedClient && recentOrders.length > 0 && (
        <div className="no-card recent">
          <div className="no-card-head">
            <span className="no-card-title">Últimas órdenes de {selectedClient.name}</span>
          </div>
          <div className="recent-rows">
            {recentOrders.map((o) => (
              <div key={o.id} className="recent-row">
                <span>{formatDate(o.created_at)}</span>
                <span className="recent-service">{o.service}</span>
                <span>{o.meters}m</span>
                <span className="recent-total">{formatCLP(o.total_amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`summary-bar ${calc ? 'ready' : ''}`}>
        <div className="summary-details">
          <div className="sd-item">
            <span className="sd-label">Precio</span>
            <span className="sd-value">{calc ? formatCLP(calc.unitPrice) + '/m' : '—'}</span>
          </div>
          <div className="sd-item">
            <span className="sd-label">Subtotal</span>
            <span className="sd-value">{calc ? formatCLP(calc.subtotal) : '—'}</span>
          </div>
          <div className="sd-item">
            <span className="sd-label">IVA 19%</span>
            <span className="sd-value">{calc ? formatCLP(calc.tax_amount) : '—'}</span>
          </div>
        </div>
        <div className="summary-total">
          <span className="st-amount">{calc ? formatCLP(calc.total_amount) : '$0'}</span>
          <button className="btn-submit" onClick={handleSubmit} disabled={!calc || !!priceError}>
            Crear Orden
          </button>
        </div>
      </div>
    </div>
  );
}
