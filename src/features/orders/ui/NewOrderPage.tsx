import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ServiceType } from '../../../shared/types';
import { unitLabel, isPerCloth } from '../../../shared/types';
import { getEffectivePrice, calculateOrder } from '../../../shared/lib/pricing';
import { formatCLP } from '../../../shared/lib/format';
import { fetchClients, fetchClientById } from '../../clients/api/clients-api';
import { fetchDefaultPrices } from '../../prices/api/prices-api';
import { apiCreateOrder, downloadCotizacion, fetchOrders } from '../api/orders-api';
import type { Client } from '../../clients/model/types';
import type { PriceTier } from '../../prices/model/types';
import type { Order, PurchaseOrder, PhotoPayload } from '../model/types';
import StepIndicator from './StepIndicator';
import ClientStep from './ClientStep';
import ServiceStep from './ServiceStep';
import DetailsStep from './DetailsStep';
import OrderSummary from './OrderSummary';
import SuccessScreen from './SuccessScreen';
import './NewOrder.css';

interface Props { onNavigate: (view: string) => void; userRole?: string }

export default function NewOrderPage({ onNavigate, userRole }: Props) {
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [activeClients, setActiveClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [service, setService] = useState<ServiceType | ''>('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [priceOverride, setPriceOverride] = useState('');
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
  const [images, setImages] = useState<string[]>([]);
  const [bultos, setBultos] = useState('');

  useEffect(() => { fetchDefaultPrices().then(setTiers).catch(() => {}); }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!clientSearch && !showDropdown) return;
      setLoadingClients(true);
      try { const res = await fetchClients({ search: clientSearch || undefined, active: true, limit: 20 }); setActiveClients(res.clients); }
      catch { /* silent */ } finally { setLoadingClients(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch, showDropdown]);

  useEffect(() => {
    if (!clientId) { setSelectedClient(null); setRecentOrders([]); return; }
    fetchClientById(clientId).then(setSelectedClient).catch(() => setSelectedClient(null));
    fetchOrders({ client_id: clientId, limit: 3 }).then((r) => setRecentOrders(r.orders)).catch(() => setRecentOrders([]));
  }, [clientId]);

  const hasTiers = useMemo(() => { const s = new Set(tiers.map((t) => t.service)); return (sv: ServiceType) => s.has(sv); }, [tiers]);
  const autoPrice = useMemo(() => {
    if (!selectedClient || !service || !quantity || Number(quantity) < (isPerCloth(service as ServiceType) ? 1 : 0.1)) return null;
    return getEffectivePrice(selectedClient, tiers, service as ServiceType, Number(quantity));
  }, [selectedClient, service, quantity, tiers]);

  const serviceHasTiers = service ? hasTiers(service as ServiceType) : false;
  const finalPrice = priceOverride && Number(priceOverride) > 0 ? Number(priceOverride) : autoPrice?.price ?? null;
  const isManualOverride = priceOverride !== '' && Number(priceOverride) > 0 && autoPrice && Number(priceOverride) !== autoPrice.price;
  const isManualOnly = service !== '' && !serviceHasTiers;

  const calc = useMemo(() => {
    if (!finalPrice || !quantity || Number(quantity) < 0.1) return null;
    return { unitPrice: finalPrice, ...calculateOrder(finalPrice, Number(quantity)) };
  }, [finalPrice, quantity]);

  useEffect(() => { if (calc) setPrevTotal(calc.total_amount); }, [calc]);
  const totalChanged = calc && prevTotal !== null && calc.total_amount !== prevTotal;

  const priceError = useMemo(() => {
    if (!service || !quantity || Number(quantity) < 0.1) return '';
    if (!hasTiers(service as ServiceType)) return '';
    const q = Number(quantity);
    const st = tiers.filter((t) => t.service === service);
    if (st.length === 0) return `No hay precios configurados para ${service}`;
    if (!st.some((t) => q >= t.min_meters && (t.max_meters === null || q <= t.max_meters))) return `No hay rango de precio para ${q} ${unitLabel(service as ServiceType)} en ${service}`;
    return '';
  }, [service, quantity, tiers, hasTiers]);

  function dataUrlToPhoto(dataUrl: string, idx: number): PhotoPayload {
    const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return { filename: `foto${idx + 1}.jpg`, content_type: 'image/jpeg', data: dataUrl };
    return { filename: `foto${idx + 1}.${match[1].split('/')[1]}`, content_type: match[1], data: match[2] };
  }

  async function handleSubmit() {
    setError('');
    if (!clientId) { setError('Seleccione un cliente'); return; }
    if (!service) { setError('Seleccione tipo de servicio'); return; }
    if (!quantity || Number(quantity) < (isPerCloth(service as ServiceType) ? 1 : 0.1)) { setError('Cantidad inválida'); return; }
    if (priceError) { setError(priceError); return; }
    setSubmitting(true);
    try {
      const hasPrice = (isManualOnly || isManualOverride) && priceOverride && Number(priceOverride) > 0;
      await apiCreateOrder({
        client_id: Number(clientId), service, description: description.trim() || undefined,
        meters: Number(quantity), unit_price: hasPrice ? Number(priceOverride) : undefined,
        bultos: bultos && Number(bultos) > 0 ? Number(bultos) : undefined,
        purchase_orders: purchaseOrders.length > 0 ? purchaseOrders.map(po => ({ oc_number: po.oc_number, ...(po.date ? { date: po.date } : {}) })) : undefined,
        photos: images.length > 0 ? images.map((img, i) => dataUrlToPhoto(img, i)) : undefined,
      });
      setSuccess(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error creando orden'); }
    finally { setSubmitting(false); }
  }

  async function handleCotizacion() {
    setError('');
    if (!clientId || !service || !calc) return;
    setGeneratingPdf(true);
    try {
      await downloadCotizacion({
        client_id: Number(clientId), service, description: description.trim() || undefined,
        meters: Number(quantity), unit_price: (isManualOnly || isManualOverride) ? Number(priceOverride) : undefined,
        purchase_orders: purchaseOrders.length > 0 ? purchaseOrders.map(po => ({ oc_number: po.oc_number, ...(po.date ? { date: po.date } : {}) })) : undefined,
      });
    } catch (e) { setError(e instanceof Error ? e.message : 'Error generando cotización'); }
    finally { setGeneratingPdf(false); }
  }

  function selectClient(id: string, name: string) { setClientId(id); setClientSearch(name); setShowDropdown(false); }
  function clearClient() { setClientId(''); setSelectedClient(null); setClientSearch(''); setService(''); setQuantity(''); setPriceOverride(''); setRecentOrders([]); }
  function resetForm() { setSuccess(false); clearClient(); setDescription(''); setPurchaseOrders([]); setImages([]); setBultos(''); setError(''); }
  function resetFormKeepClient() { setSuccess(false); setService(''); setQuantity(''); setPriceOverride(''); setDescription(''); setPurchaseOrders([]); setImages([]); setBultos(''); setError(''); }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files; if (!files) return;
    Array.from(files).forEach((file) => { if (!file.type.startsWith('image/')) return; const r = new FileReader(); r.onload = () => setImages((p) => [...p, r.result as string]); r.readAsDataURL(file); });
    e.target.value = '';
  }

  const step = !clientId ? 1 : !service ? 2 : 3;

  if (success) return <SuccessScreen selectedClient={selectedClient} onViewOrders={() => onNavigate('orders')} onCreateAnother={resetForm} onCreateForSameClient={resetFormKeepClient} />;

  return (
    <div className="no-layout">
      <AnimatePresence>
        {submitting && (
          <motion.div className="pb-loading-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <motion.div className="pb-loading-content" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
              <div className="pb-loading-spinner" /><span className="pb-loading-brand">PUBLIBOR</span><span className="pb-loading-text">Creando orden...</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="no-form">
        {error && <div className="error-msg">{error}</div>}
        <StepIndicator step={step} clientDone={!!clientId} serviceDone={!!service} detailsDone={!!quantity && Number(quantity) >= 0.1} />
        <ClientStep active={step === 1} clientId={clientId} clientSearch={clientSearch} selectedClient={selectedClient} filteredClients={activeClients} showDropdown={showDropdown} loadingClients={loadingClients} onSearchChange={(v) => { setClientSearch(v); setShowDropdown(true); setClientId(''); }} onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)} onSelect={selectClient} onClear={clearClient} />
        <ServiceStep active={step === 2} service={service} onSelect={(s) => { setService(s); setPriceOverride(''); }} onClear={() => { setService(''); setPriceOverride(''); }} />
        {service && (
          <DetailsStep active={step >= 3} service={service as ServiceType} quantity={quantity} description={description} bultos={bultos} priceOverride={priceOverride} purchaseOrders={purchaseOrders} images={images} autoPrice={autoPrice} isManualOnly={!!isManualOnly} isManualOverride={!!isManualOverride} priceError={priceError} userRole={userRole} onQuantityChange={setQuantity} onDescriptionChange={setDescription} onBultosChange={setBultos} onPriceOverrideChange={setPriceOverride} onPurchaseOrdersChange={setPurchaseOrders} onImagesChange={setImages} onImageUpload={handleImageUpload} />
        )}
        {!service && step < 3 && null}
      </div>
      <OrderSummary selectedClient={selectedClient} service={service} quantity={quantity} description={description} bultos={bultos} purchaseOrders={purchaseOrders} images={images} calc={calc} isManualOnly={!!isManualOnly} isManualOverride={!!isManualOverride} priceError={priceError} totalChanged={!!totalChanged} submitting={submitting} generatingPdf={generatingPdf} recentOrders={recentOrders} userRole={userRole} onSubmit={handleSubmit} onCotizacion={handleCotizacion} />
      <div className={`summary-bar-mobile ${calc ? 'ready' : ''}`}>
        <span className={`st-amount ${totalChanged ? 'pulse' : ''}`} key={calc ? `m${calc.total_amount}` : 'mz'}>{calc ? formatCLP(calc.total_amount) : '$0'}</span>
        {userRole !== 'operator' && <button className="btn-cotizacion" onClick={handleCotizacion} disabled={!calc || !!priceError || generatingPdf}>{generatingPdf ? '...' : 'PDF'}</button>}
        <button className="btn-submit" onClick={handleSubmit} disabled={!quantity || Number(quantity) < 0.1 || (userRole !== 'operator' && !!priceError) || submitting}>{submitting ? '...' : 'Crear'}</button>
      </div>
    </div>
  );
}
