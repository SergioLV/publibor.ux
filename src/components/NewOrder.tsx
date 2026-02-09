import { useState, useMemo, useEffect } from 'react';
import type { Client, PriceTier, ServiceType } from '../data/types';
import { SERVICE_TYPES, unitLabel, isPerCloth } from '../data/types';
import { getEffectivePrice, calculateOrder } from '../data/store';
import { fetchClients, fetchClientById, fetchDefaultPrices, apiCreateOrder, fetchOrders } from '../data/api';
import { formatCLP, formatDate } from '../data/format';
import type { Order } from '../data/types';
import './NewOrder.css';

interface Props {
  onNavigate: (view: string) => void;
}

export default function NewOrder({ onNavigate }: Props) {
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [activeClients, setActiveClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [service, setService] = useState<ServiceType | ''>('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [priceOverride, setPriceOverride] = useState<string>('');
  const [clientSearch, setClientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchDefaultPrices().then(setTiers).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!clientSearch && !showDropdown) return;
      setLoadingClients(true);
      try {
        const res = await fetchClients({ search: clientSearch || undefined, active: true, limit: 20 });
        setActiveClients(res.clients);
      } catch { /* silent */ }
      finally { setLoadingClients(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch, showDropdown]);

  useEffect(() => {
    if (!clientId) { setSelectedClient(null); setRecentOrders([]); return; }
    fetchClientById(clientId).then(setSelectedClient).catch(() => setSelectedClient(null));
    fetchOrders({ client_id: clientId, limit: 3 })
      .then((res) => setRecentOrders(res.orders))
      .catch(() => setRecentOrders([]));
  }, [clientId]);

  const filteredClients = activeClients;

  const availableServices = useMemo(() => {
    const services = new Set(tiers.map((t) => t.service));
    return SERVICE_TYPES.filter((s) => services.has(s));
  }, [tiers]);

  // Auto-resolved price from tier + client override
  const autoPrice = useMemo(() => {
    if (!selectedClient || !service || !quantity || Number(quantity) < (isPerCloth(service as ServiceType) ? 1 : 0.1)) return null;
    const q = Number(quantity);
    return getEffectivePrice(selectedClient, tiers, service as ServiceType, q);
  }, [selectedClient, service, quantity, tiers]);

  // Final price: user override or auto-resolved
  const finalPrice = priceOverride && Number(priceOverride) > 0 ? Number(priceOverride) : autoPrice?.price ?? null;
  const isManualOverride = priceOverride !== '' && Number(priceOverride) > 0 && autoPrice && Number(priceOverride) !== autoPrice.price;

  const calc = useMemo(() => {
    if (!finalPrice || !quantity || Number(quantity) < 0.1) return null;
    const q = Number(quantity);
    return { unitPrice: finalPrice, tier: autoPrice?.tier ?? null, isOverride: autoPrice?.isOverride ?? false, ...calculateOrder(finalPrice, q) };
  }, [finalPrice, quantity, autoPrice]);

  const priceError = useMemo(() => {
    if (!service || !quantity || Number(quantity) < 0.1) return '';
    const q = Number(quantity);
    const serviceTiers = tiers.filter((t) => t.service === service);
    if (serviceTiers.length === 0) return `No hay precios configurados para ${service}`;
    const matched = serviceTiers.some((t) => q >= t.min_meters && (t.max_meters === null || q <= t.max_meters));
    if (!matched) return `No hay rango de precio para ${q} ${unitLabel(service as ServiceType)} en ${service}`;
    return '';
  }, [service, quantity, tiers]);

  async function handleSubmit() {
    setError('');
    if (!clientId) { setError('Seleccione un cliente'); return; }
    if (!service) { setError('Seleccione tipo de servicio'); return; }
    const minQty = isPerCloth(service as ServiceType) ? 1 : 0.1;
    if (!quantity || Number(quantity) < minQty) { setError(`Cantidad debe ser ≥ ${minQty}`); return; }
    if (priceError) { setError(priceError); return; }
    if (!calc) return;

    setSubmitting(true);
    try {
      await apiCreateOrder({
        client_id: Number(clientId),
        service: service as string,
        description: description.trim() || undefined,
        meters: Number(quantity),
        unit_price: isManualOverride ? Number(priceOverride) : undefined,
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creando orden');
    } finally {
      setSubmitting(false);
    }
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
    setQuantity('');
    setDescription('');
    setPriceOverride('');
    setClientSearch('');
    setError('');
    setRecentOrders([]);
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
        <div className={`step ${step >= 3 ? 'active' : ''} ${quantity && Number(quantity) >= 0.1 ? 'done' : ''}`}>
          <span className="step-num">3</span><span className="step-label">Cantidad</span>
        </div>
      </div>

      {/* Step 1: Client */}
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
            {selectedClient.prices.length > 0 && (
              <div className="cb-overrides">
                <span className="cb-overrides-label">{selectedClient.prices.length} precio{selectedClient.prices.length > 1 ? 's' : ''} especial{selectedClient.prices.length > 1 ? 'es' : ''}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Service */}
      <div className="no-card">
        <div className="no-card-head">
          <span className="no-card-num">2</span>
          <span className="no-card-title">Tipo de servicio</span>
        </div>
        <div className="service-grid">
          {availableServices.map((s) => (
            <button
              key={s}
              className={`service-option ${service === s ? 'selected' : ''}`}
              onClick={() => { setService(s); setQuantity(''); setPriceOverride(''); }}
            >
              <span className="so-name">{s}</span>
              <span className="so-unit">por {unitLabel(s)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Quantity + Description */}
      <div className="no-card">
        <div className="no-card-head">
          <span className="no-card-num">3</span>
          <span className="no-card-title">
            {service && isPerCloth(service as ServiceType) ? 'Cantidad de paños' : 'Cantidad en metros'}
          </span>
        </div>
        <input
          className="meters-input"
          type="number"
          min={service && isPerCloth(service as ServiceType) ? '1' : '0.1'}
          step={service && isPerCloth(service as ServiceType) ? '1' : '0.1'}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0"
        />
        {priceError && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{priceError}</div>}
        {autoPrice && (
          <div className="tier-info">
            Rango: {autoPrice.tier.min_meters}{autoPrice.tier.max_meters ? `–${autoPrice.tier.max_meters}` : '+'} {unitLabel(service as ServiceType)}
            {' · '}Precio sugerido: {formatCLP(autoPrice.price)}/{unitLabel(service as ServiceType)}
            {autoPrice.isOverride && <span className="override-badge">Precio especial</span>}
          </div>
        )}
        {autoPrice && (
          <div className="price-override-row" style={{ marginTop: '0.5rem' }}>
            <label className="price-override-label">
              Precio unitario (CLP/{unitLabel(service as ServiceType)})
              <div className="price-override-input-wrap">
                <span className="price-prefix">$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={priceOverride}
                  onChange={(e) => setPriceOverride(e.target.value)}
                  placeholder={String(autoPrice.price)}
                />
              </div>
            </label>
            {isManualOverride && (
              <button className="btn-sm" onClick={() => setPriceOverride('')} style={{ marginTop: '0.25rem' }}>
                Usar precio sugerido
              </button>
            )}
          </div>
        )}
        <input
          className="description-input"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción (opcional)"
          style={{ marginTop: '0.75rem' }}
        />
      </div>

      {/* Recent orders */}
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
                <span>{o.meters}{unitLabel(o.service)}</span>
                <span className="recent-total">{formatCLP(o.total_amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div className={`summary-bar ${calc ? 'ready' : ''}`}>
        <div className="summary-details">
          <div className="sd-item">
            <span className="sd-label">Precio{isManualOverride ? ' (manual)' : ''}</span>
            <span className="sd-value">{calc ? formatCLP(calc.unitPrice) + '/' + unitLabel(service as ServiceType) : '—'}</span>
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
          <button className="btn-submit" onClick={handleSubmit} disabled={!calc || !!priceError || submitting}>
            {submitting ? 'Creando...' : 'Crear Orden'}
          </button>
        </div>
      </div>
    </div>
  );
}
