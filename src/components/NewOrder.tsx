import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Client, PriceTier, ServiceType, PurchaseOrder } from '../data/types';
import { unitLabel, isPerCloth } from '../data/types';
import { getEffectivePrice, calculateOrder } from '../data/store';
import { fetchClients, fetchClientById, fetchDefaultPrices, apiCreateOrder, fetchOrders, downloadCotizacion } from '../data/api';
import type { PhotoPayload } from '../data/api';
import { formatCLP, formatDate } from '../data/format';
import type { Order } from '../data/types';
import './NewOrder.css';

const SERVICE_ICONS: Record<string, string> = {
  DTF: '🖨️',
  SUBLIMACION: '🎨',
  UV: '💎',
  TEXTURIZADO: '🧵',
  LASER_CO2: '🔥',
  LASER_FIBRA: '⚡',
  BORDADOS: '🪡',
  TEXTIL: '👕',
  POR_CONFIRMAR: '📦',
};

function clientInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

interface Props {
  onNavigate: (view: string) => void;
  userRole?: string;
}

export default function NewOrder({ onNavigate, userRole }: Props) {
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
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [prevTotal, setPrevTotal] = useState<number | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [showMoreServices, setShowMoreServices] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [bultos, setBultos] = useState('');

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

  const hasTiers = useMemo(() => {
    const services = new Set(tiers.map((t) => t.service));
    return (s: ServiceType) => services.has(s);
  }, [tiers]);

  const autoPrice = useMemo(() => {
    if (!selectedClient || !service || !quantity || Number(quantity) < (isPerCloth(service as ServiceType) ? 1 : 0.1)) return null;
    const q = Number(quantity);
    return getEffectivePrice(selectedClient, tiers, service as ServiceType, q);
  }, [selectedClient, service, quantity, tiers]);

  const serviceHasTiers = service ? hasTiers(service as ServiceType) : false;
  const finalPrice = priceOverride && Number(priceOverride) > 0 ? Number(priceOverride) : autoPrice?.price ?? null;
  const isManualOverride = priceOverride !== '' && Number(priceOverride) > 0 && autoPrice && Number(priceOverride) !== autoPrice.price;
  const isManualOnly = service !== '' && !serviceHasTiers;

  const calc = useMemo(() => {
    if (!finalPrice || !quantity || Number(quantity) < 0.1) return null;
    const q = Number(quantity);
    return { unitPrice: finalPrice, tier: autoPrice?.tier ?? null, isOverride: autoPrice?.isOverride ?? false, ...calculateOrder(finalPrice, q) };
  }, [finalPrice, quantity, autoPrice]);

  useEffect(() => {
    if (calc) setPrevTotal(calc.total_amount);
  }, [calc]);

  const totalChanged = calc && prevTotal !== null && calc.total_amount !== prevTotal;

  const priceError = useMemo(() => {
    if (!service || !quantity || Number(quantity) < 0.1) return '';
    if (!hasTiers(service as ServiceType)) return ''; // manual price services — no tier needed
    const q = Number(quantity);
    const serviceTiers = tiers.filter((t) => t.service === service);
    if (serviceTiers.length === 0) return `No hay precios configurados para ${service}`;
    const matched = serviceTiers.some((t) => q >= t.min_meters && (t.max_meters === null || q <= t.max_meters));
    if (!matched) return `No hay rango de precio para ${q} ${unitLabel(service as ServiceType)} en ${service}`;
    return '';
  }, [service, quantity, tiers, hasTiers]);

  function dataUrlToPhoto(dataUrl: string, idx: number): PhotoPayload {
    const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return { filename: `foto${idx + 1}.jpg`, content_type: 'image/jpeg', data: dataUrl };
    const ext = match[1].split('/')[1];
    return { filename: `foto${idx + 1}.${ext}`, content_type: match[1], data: match[2] };
  }

  async function handleSubmit() {
    setError('');
    if (!clientId) { setError('Seleccione un cliente'); return; }
    if (!service) { setError('Seleccione tipo de servicio'); return; }
    const minQty = isPerCloth(service as ServiceType) ? 1 : 0.1;
    if (!quantity || Number(quantity) < minQty) { setError(`Cantidad debe ser ≥ ${minQty}`); return; }
    if (priceError) { setError(priceError); return; }
    setSubmitting(true);
    try {
      const hasPrice = (isManualOnly || isManualOverride) && priceOverride && Number(priceOverride) > 0;
      await apiCreateOrder({
        client_id: Number(clientId),
        service: service as string,
        description: description.trim() || undefined,
        meters: Number(quantity),
        unit_price: hasPrice ? Number(priceOverride) : undefined,
        bultos: bultos && Number(bultos) > 0 ? Number(bultos) : undefined,
        purchase_orders: purchaseOrders.length > 0 ? purchaseOrders.map(po => ({
          oc_number: po.oc_number,
          ...(po.date ? { date: po.date } : {}),
        })) : undefined,
        photos: images.length > 0 ? images.map((img, i) => dataUrlToPhoto(img, i)) : undefined,
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creando orden');
    } finally { setSubmitting(false); }
  }

  async function handleCotizacion() {
    setError('');
    if (!clientId || !service || !calc) return;
    setGeneratingPdf(true);
    try {
      await downloadCotizacion({
        client_id: Number(clientId),
        service: service as string,
        description: description.trim() || undefined,
        meters: Number(quantity),
        unit_price: (isManualOnly || isManualOverride) ? Number(priceOverride) : undefined,
        purchase_orders: purchaseOrders.length > 0 ? purchaseOrders.map(po => ({
          oc_number: po.oc_number,
          ...(po.date ? { date: po.date } : {}),
        })) : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando cotización');
    } finally { setGeneratingPdf(false); }
  }

  function selectClient(id: string, name: string) {
    setClientId(id);
    setClientSearch(name);
    setShowDropdown(false);
  }

  function clearClient() {
    setClientId('');
    setSelectedClient(null);
    setClientSearch('');
    setService('');
    setQuantity('');
    setPriceOverride('');
    setRecentOrders([]);
    setShowMoreServices(false);
  }

  function resetForm() {
    setSuccess(false);
    clearClient();
    setDescription('');
    setPurchaseOrders([]);
    setImages([]);
    setBultos('');
    setError('');
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function resetFormKeepClient() {
    setSuccess(false);
    setService('');
    setQuantity('');
    setPriceOverride('');
    setDescription('');
    setPurchaseOrders([]);
    setImages([]);
    setBultos('');
    setError('');
    setShowMoreServices(false);
  }

  const step = !clientId ? 1 : !service ? 2 : 3;

  if (success) {
    return (
      <div className="no-layout">
        <div className="success-box">
          <div className="success-icon">✓</div>
          <h2>Orden creada</h2>
          <p>La orden ha sido registrada exitosamente.</p>
          <div className="success-actions">
            <button className="btn-primary" onClick={() => onNavigate('orders')}>Ver Órdenes</button>
            {selectedClient && (
              <button className="btn-primary" onClick={resetFormKeepClient}>
                Crear otra orden para {selectedClient.name}
              </button>
            )}
            <button className="btn-ghost" onClick={resetForm}>Crear otra</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="no-layout">
      <AnimatePresence>
        {submitting && (
          <motion.div
            className="pb-loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="pb-loading-content"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="pb-loading-spinner" />
              <span className="pb-loading-brand">PUBLIBOR</span>
              <span className="pb-loading-text">Creando orden...</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* LEFT: Form */}
      <div className="no-form">
        {error && <div className="error-msg">{error}</div>}

        {/* Steps progress bar */}
        <div className="steps">
          <div className="steps-track">
            <div className="steps-fill" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }} />
          </div>
          <div className={`step ${step >= 1 ? 'active' : ''} ${clientId ? 'done' : ''}`}>
            <span className="step-num">{clientId ? '✓' : '1'}</span>
            <span className="step-label">Cliente</span>
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''} ${service ? 'done' : ''}`}>
            <span className="step-num">{service ? '✓' : '2'}</span>
            <span className="step-label">Servicio</span>
          </div>
          <div className={`step ${step >= 3 ? 'active' : ''} ${quantity && Number(quantity) >= 0.1 ? 'done' : ''}`}>
            <span className="step-num">{quantity && Number(quantity) >= 0.1 ? '✓' : '3'}</span>
            <span className="step-label">Cantidad</span>
          </div>
        </div>

        {/* Step 1: Client */}
        {step === 1 ? (
          <div className="no-card card-active card-enter">
            <div className="no-card-head">
              <span className="no-card-num">1</span>
              <span className="no-card-title title-active">Seleccionar cliente</span>
            </div>
            <div className="dropdown-wrap">
              <div className="input-search-wrap">
                <input
                  type="text"
                  placeholder="Buscar por nombre o RUT..."
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true); setClientId(''); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                />
                {loadingClients && <span className="input-spinner" />}
              </div>
              {showDropdown && !loadingClients && filteredClients.length > 0 && (
                <ul className="dropdown-list">
                  {filteredClients.map((c) => (
                    <li key={c.id} onMouseDown={(e) => { e.preventDefault(); selectClient(c.id, c.name); }}>
                      <span className="dd-name">{c.name}</span>
                      {c.rut && <span className="dd-rut">{c.rut}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {showDropdown && loadingClients && (
                <div className="dropdown-skeleton">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="dd-skeleton-row">
                      <div className="dd-sk-name skeleton-block" />
                      <div className="dd-sk-rut skeleton-block" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="no-card card-collapsed" onClick={clearClient}>
            <div className="collapsed-row">
              <span className="no-card-num">✓</span>
              <span className="collapsed-label">Cliente</span>
              <div className="collapsed-value">
                {selectedClient && <span className="cb-avatar cb-avatar-sm">{clientInitials(selectedClient.name)}</span>}
                <span>{selectedClient?.name}</span>
              </div>
              <button className="collapsed-change" onClick={(e) => { e.stopPropagation(); clearClient(); }}>Cambiar</button>
            </div>
          </div>
        )}

        {/* Step 2: Service */}
        {step === 2 ? (
          <div className="no-card card-active card-enter">
            <div className="no-card-head">
              <span className="no-card-num">2</span>
              <span className="no-card-title title-active">Tipo de servicio</span>
            </div>
            {!showMoreServices ? (
              <div className="service-grid service-grid-2">
                <button
                  className="service-option so-quick"
                  onClick={() => { setService('POR_CONFIRMAR' as ServiceType); setPriceOverride(''); }}
                >
                  <span className="so-icon">📦</span>
                  <span className="so-name">Por confirmar</span>
                  <span className="so-unit">orden rápida</span>
                </button>
                <button
                  className="service-option so-more"
                  onClick={() => setShowMoreServices(true)}
                >
                  <span className="so-icon">➕</span>
                  <span className="so-name">Otro</span>
                  <span className="so-unit">elegir servicio</span>
                </button>
              </div>
            ) : (
              <>
                <button className="so-back-btn" onClick={() => setShowMoreServices(false)}>
                  ← Volver
                </button>
                <div className="service-grid">
                  {(['DTF', 'SUBLIMACION', 'UV', 'TEXTURIZADO', 'LASER_CO2', 'LASER_FIBRA', 'BORDADOS', 'TEXTIL'] as ServiceType[]).map((s) => (
                    <button
                      key={s}
                      className={`service-option ${service === s ? 'selected' : ''}`}
                      onClick={() => { setService(s); setPriceOverride(''); }}
                    >
                      <span className="so-icon">{SERVICE_ICONS[s] ?? '📋'}</span>
                      <span className="so-name">{s.replace('_', ' ')}</span>
                      <span className="so-unit">por {unitLabel(s)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : service ? (
          <div className="no-card card-collapsed" onClick={() => { setService(''); setPriceOverride(''); setShowMoreServices(false); }}>
            <div className="collapsed-row">
              <span className="no-card-num">✓</span>
              <span className="collapsed-label">Servicio</span>
              <span className="collapsed-value">
                <span className="collapsed-service-icon">{SERVICE_ICONS[service] ?? '📋'}</span>
                {service === 'POR_CONFIRMAR' ? 'Por confirmar' : service}
              </span>
              <button className="collapsed-change" onClick={(e) => { e.stopPropagation(); setService(''); setPriceOverride(''); setShowMoreServices(false); }}>Cambiar</button>
            </div>
          </div>
        ) : (
          <div className="no-card card-pending">
            <div className="collapsed-row">
              <span className="no-card-num">2</span>
              <span className="collapsed-label dim">Tipo de servicio</span>
            </div>
          </div>
        )}

        {/* Step 3: Quantity + Description */}
        {step >= 3 ? (
          <div className="no-card card-active card-enter">
            <div className="no-card-head">
              <span className="no-card-num">3</span>
              <span className="no-card-title title-active">
                {service && isPerCloth(service as ServiceType)
                  ? (service === 'TEXTURIZADO' ? 'Cantidad de paños' : 'Cantidad de unidades')
                  : 'Cantidad en metros'}
              </span>
            </div>
            <div className="qty-input-wrap">
              <input
                className="meters-input"
                type="number"
                min={service && isPerCloth(service as ServiceType) ? '1' : '0.1'}
                step={service && isPerCloth(service as ServiceType) ? '1' : '0.1'}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
              <span className="qty-unit">{service ? unitLabel(service as ServiceType) : 'mts'}</span>
            </div>
            {priceError && userRole !== 'operator' && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{priceError}</div>}
            {userRole !== 'operator' && !isManualOnly && autoPrice && (
              <div className="tier-info">
                Rango: {autoPrice.tier.min_meters}{autoPrice.tier.max_meters ? `–${autoPrice.tier.max_meters}` : '+'} {unitLabel(service as ServiceType)}
                {' · '}Precio sugerido: {formatCLP(autoPrice.price)}/{unitLabel(service as ServiceType)}
                {autoPrice.isOverride && <span className="override-badge">Precio especial</span>}
              </div>
            )}
            {userRole !== 'operator' && (
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
                    placeholder={autoPrice ? String(autoPrice.price) : 'Ingrese precio'}
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
            <div className="desc-bultos-row">
              <input
                className="description-input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción (opcional)"
              />
              <div className="bultos-wrap">
                <input
                  className="bultos-input"
                  type="number"
                  min="0"
                  step="1"
                  value={bultos}
                  onChange={(e) => setBultos(e.target.value)}
                  placeholder="0"
                />
                <span className="bultos-label">bultos</span>
              </div>
            </div>

            {/* Purchase Orders */}
            {userRole !== 'operator' && (
            <div className="po-section">
              <div className="po-header">
                <span className="po-title">Órdenes de compra</span>
                <button
                  type="button"
                  className="po-add-btn"
                  onClick={() => setPurchaseOrders([...purchaseOrders, { oc_number: '', date: '' }])}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  Agregar OC
                </button>
              </div>
              {purchaseOrders.map((po, idx) => (
                <div key={idx} className="po-row">
                  <input
                    type="text"
                    className="po-input po-number"
                    value={po.oc_number}
                    onChange={(e) => {
                      const updated = [...purchaseOrders];
                      updated[idx] = { ...updated[idx], oc_number: e.target.value };
                      setPurchaseOrders(updated);
                    }}
                    placeholder="Nº orden de compra"
                  />
                  <input
                    type="date"
                    className="po-input po-date"
                    value={po.date || ''}
                    onChange={(e) => {
                      const updated = [...purchaseOrders];
                      updated[idx] = { ...updated[idx], date: e.target.value || undefined };
                      setPurchaseOrders(updated);
                    }}
                  />
                  <button
                    type="button"
                    className="po-remove"
                    onClick={() => setPurchaseOrders(purchaseOrders.filter((_, i) => i !== idx))}
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            )}

            {/* Images */}
            <div className="img-section">
              <div className="img-dropzone-row">
                <label className="img-dropzone">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span className="img-dropzone-text">Tomar foto</span>
                  <span className="img-dropzone-hint">Abrir cámara</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} hidden />
                </label>
                <label className="img-dropzone">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span className="img-dropzone-text">Galería</span>
                  <span className="img-dropzone-hint">Seleccionar imágenes</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} hidden />
                </label>
              </div>
              {images.length > 0 && (
                <div className="img-grid">
                  {images.map((src, idx) => (
                    <div key={idx} className="img-thumb">
                      <img src={src} alt={`Imagen ${idx + 1}`} />
                      <button className="img-remove" onClick={() => setImages(images.filter((_, i) => i !== idx))} title="Eliminar">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="no-card card-pending">
            <div className="collapsed-row">
              <span className="no-card-num">3</span>
              <span className="collapsed-label dim">Cantidad</span>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Sticky summary panel */}
      <aside className="no-sidebar">
        <div className={`side-summary ${calc ? 'side-ready' : ''}`}>
          <div className="side-summary-head">Resumen de orden</div>

          <div className="side-rows">
            <div className="side-row">
              <span className="side-row-label">Cliente</span>
              <span className="side-row-value">{selectedClient?.name ?? '—'}</span>
            </div>
            <div className="side-row">
              <span className="side-row-label">Servicio</span>
              <span className="side-row-value">{service || '—'}</span>
            </div>
            <div className="side-row">
              <span className="side-row-label">Cantidad</span>
              <span className="side-row-value">{quantity ? `${quantity} ${service ? unitLabel(service as ServiceType) : 'mts'}` : '—'}</span>
            </div>
            {description && (
              <div className="side-row">
                <span className="side-row-label">Descripción</span>
                <span className="side-row-value side-row-desc">{description}</span>
              </div>
            )}
            {bultos && Number(bultos) > 0 && (
              <div className="side-row">
                <span className="side-row-label">Bultos</span>
                <span className="side-row-value">{bultos}</span>
              </div>
            )}
            {purchaseOrders.length > 0 && (
              <div className="side-row">
                <span className="side-row-label">OC</span>
                <span className="side-row-value">{purchaseOrders.filter(po => po.oc_number).length} orden{purchaseOrders.filter(po => po.oc_number).length !== 1 ? 'es' : ''}</span>
              </div>
            )}
            {images.length > 0 && (
              <div className="side-row">
                <span className="side-row-label">Imágenes</span>
                <span className="side-row-value">{images.length}</span>
              </div>
            )}
          </div>

          <div className="side-divider" />

          <div className="side-rows">
            {userRole !== 'operator' && (
            <>
            <div className="side-row">
              <span className="side-row-label">Precio{isManualOnly ? ' (manual)' : isManualOverride ? ' (manual)' : ''}</span>
              <span className="side-row-value">{calc ? formatCLP(calc.unitPrice) + '/' + unitLabel(service as ServiceType) : '—'}</span>
            </div>
            <div className="side-row">
              <span className="side-row-label">Subtotal</span>
              <span className="side-row-value">{calc ? formatCLP(calc.subtotal) : '—'}</span>
            </div>
            <div className="side-row">
              <span className="side-row-label">IVA 19%</span>
              <span className="side-row-value">{calc ? formatCLP(calc.tax_amount) : '—'}</span>
            </div>
            </>
            )}
          </div>

          {userRole !== 'operator' && <div className="side-divider" />}

          {userRole !== 'operator' && (
          <div className="side-total-row">
            <span className="side-total-label">Total</span>
            <span className={`side-total-amount ${totalChanged ? 'pulse' : ''}`} key={calc?.total_amount}>
              {calc ? formatCLP(calc.total_amount) : '$0'}
            </span>
          </div>
          )}

          <div className="side-actions">
            <button className="btn-submit side-btn" onClick={handleSubmit} disabled={!quantity || Number(quantity) < 0.1 || (userRole !== 'operator' && !!priceError) || submitting}>
              {submitting ? 'Creando...' : 'Crear Orden'}
            </button>
            {userRole !== 'operator' && (
            <button className="btn-cotizacion side-btn" onClick={handleCotizacion} disabled={!calc || !!priceError || generatingPdf}>
              {generatingPdf ? 'Generando...' : 'Cotización PDF'}
            </button>
            )}
          </div>
        </div>

        {/* Recent orders in sidebar */}
        {selectedClient && recentOrders.length > 0 && (
          <div className="side-recent">
            <div className="side-recent-head">Últimas órdenes</div>
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
      </aside>

      {/* Mobile-only bottom bar */}
      <div className={`summary-bar-mobile ${calc ? 'ready' : ''}`}>
        <span className={`st-amount ${totalChanged ? 'pulse' : ''}`} key={calc ? `m${calc.total_amount}` : 'mz'}>
          {calc ? formatCLP(calc.total_amount) : '$0'}
        </span>
        {userRole !== 'operator' && (
        <button className="btn-cotizacion" onClick={handleCotizacion} disabled={!calc || !!priceError || generatingPdf}>
          {generatingPdf ? '...' : 'PDF'}
        </button>
        )}
        <button className="btn-submit" onClick={handleSubmit} disabled={!quantity || Number(quantity) < 0.1 || (userRole !== 'operator' && !!priceError) || submitting}>
          {submitting ? '...' : 'Crear'}
        </button>
      </div>
    </div>
  );
}
