import type { ServiceType } from '../../../shared/types';
import { unitLabel, isPerCloth } from '../../../shared/types';
import { formatCLP } from '../../../shared/lib/format';
import type { PurchaseOrder } from '../model/types';

interface AutoPrice { price: number; tier: { min_meters: number; max_meters: number | null }; isOverride: boolean }

interface Props {
  active: boolean;
  service: ServiceType;
  quantity: string;
  description: string;
  bultos: string;
  priceOverride: string;
  purchaseOrders: PurchaseOrder[];
  images: string[];
  autoPrice: AutoPrice | null;
  isManualOnly: boolean;
  isManualOverride: boolean;
  priceError: string;
  userRole?: string;
  onQuantityChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onBultosChange: (v: string) => void;
  onPriceOverrideChange: (v: string) => void;
  onPurchaseOrdersChange: (po: PurchaseOrder[]) => void;
  onImagesChange: (imgs: string[]) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function DetailsStep(p: Props) {
  if (!p.active) {
    return (
      <div className="no-card card-pending">
        <div className="collapsed-row">
          <span className="no-card-num">3</span>
          <span className="collapsed-label dim">Cantidad</span>
          <span className="pending-hint">Ingresa cantidad y detalles</span>
        </div>
      </div>
    );
  }

  const unit = unitLabel(p.service);
  const perCloth = isPerCloth(p.service);

  return (
    <div className="no-card card-active card-enter">
      <div className="no-card-head">
        <span className="no-card-num">3</span>
        <span className="no-card-title title-active">
          {perCloth ? (p.service === 'TEXTURIZADO' ? 'Cantidad de paños' : 'Cantidad de unidades') : 'Cantidad en metros'}
        </span>
      </div>
      <div className="qty-input-wrap">
        <input className="meters-input" type="number" min={perCloth ? '1' : '0.1'} step={perCloth ? '1' : '0.1'} value={p.quantity} onChange={(e) => p.onQuantityChange(e.target.value)} placeholder="0" />
        <span className="qty-unit">{unit}</span>
      </div>
      {p.priceError && p.userRole !== 'operator' && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{p.priceError}</div>}
      {p.userRole !== 'operator' && !p.isManualOnly && p.autoPrice && (
        <div className="tier-info">
          Rango: {p.autoPrice.tier.min_meters}{p.autoPrice.tier.max_meters ? `–${p.autoPrice.tier.max_meters}` : '+'} {unit}
          {' · '}Precio sugerido: {formatCLP(p.autoPrice.price)}/{unit}
          {p.autoPrice.isOverride && <span className="override-badge">Precio especial</span>}
        </div>
      )}
      {p.userRole !== 'operator' && (
        <div className="price-override-row" style={{ marginTop: '0.5rem' }}>
          <label className="price-override-label">
            Precio unitario (CLP/{unit})
            <div className="price-override-input-wrap">
              <span className="price-prefix">$</span>
              <input type="number" min="1" step="1" value={p.priceOverride} onChange={(e) => p.onPriceOverrideChange(e.target.value)} placeholder={p.autoPrice ? String(p.autoPrice.price) : 'Ingrese precio'} />
            </div>
          </label>
          {p.isManualOverride && <button className="btn-sm" onClick={() => p.onPriceOverrideChange('')} style={{ marginTop: '0.25rem' }}>Usar precio sugerido</button>}
        </div>
      )}
      <div className="desc-bultos-row">
        <input className="description-input" type="text" value={p.description} onChange={(e) => p.onDescriptionChange(e.target.value)} placeholder="Descripción (opcional)" />
        <div className="bultos-wrap">
          <input className="bultos-input" type="number" min="0" step="1" value={p.bultos} onChange={(e) => p.onBultosChange(e.target.value)} placeholder="0" />
          <span className="bultos-label">bultos</span>
        </div>
      </div>

      {/* Purchase Orders */}
      {p.userRole !== 'operator' && (
        <div className="po-section">
          <div className="po-header">
            <span className="po-title">Órdenes de compra</span>
            <button type="button" className="po-add-btn" onClick={() => p.onPurchaseOrdersChange([...p.purchaseOrders, { oc_number: '', date: '' }])}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              Agregar OC
            </button>
          </div>
          {p.purchaseOrders.map((po, idx) => (
            <div key={idx} className="po-row">
              <input type="text" className="po-input po-number" value={po.oc_number} onChange={(e) => { const u = [...p.purchaseOrders]; u[idx] = { ...u[idx], oc_number: e.target.value }; p.onPurchaseOrdersChange(u); }} placeholder="Nº orden de compra" />
              <input type="date" className="po-input po-date" value={po.date || ''} onChange={(e) => { const u = [...p.purchaseOrders]; u[idx] = { ...u[idx], date: e.target.value || undefined }; p.onPurchaseOrdersChange(u); }} />
              <button type="button" className="po-remove" onClick={() => p.onPurchaseOrdersChange(p.purchaseOrders.filter((_, i) => i !== idx))} title="Eliminar">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Images */}
      <div className="img-section">
        <div className="img-dropzone-row">
          <label className="img-dropzone">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span className="img-dropzone-text">Tomar foto</span>
            <span className="img-dropzone-hint">Abrir cámara</span>
            <input type="file" accept="image/*" capture="environment" onChange={p.onImageUpload} hidden />
          </label>
          <label className="img-dropzone">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span className="img-dropzone-text">Galería</span>
            <span className="img-dropzone-hint">Seleccionar imágenes</span>
            <input type="file" accept="image/*" multiple onChange={p.onImageUpload} hidden />
          </label>
        </div>
        {p.images.length > 0 && (
          <div className="img-grid">
            {p.images.map((src, idx) => (
              <div key={idx} className="img-thumb">
                <img src={src} alt={`Imagen ${idx + 1}`} />
                <button className="img-remove" onClick={() => p.onImagesChange(p.images.filter((_, i) => i !== idx))} title="Eliminar">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
