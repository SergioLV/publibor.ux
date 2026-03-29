import { useState } from 'react';
import type { Order, PurchaseOrder, OrderPhoto } from '../model/types';
import type { Client } from '../../clients/model/types';
import type { ServiceType } from '../../../shared/types';
import { SERVICE_TYPES, unitLabel, isPerCloth } from '../../../shared/types';
import { formatCLP } from '../../../shared/lib/format';
import { getCotizacionPdf, downloadExcelExport } from '../api/orders-api';

const SERVICE_ICONS: Record<string, string> = {
  DTF: '🖨️', SUBLIMACION: '🎨', UV: '💎', TEXTURIZADO: '🧵',
  LASER_CO2: '🔥', LASER_FIBRA: '⚡', BORDADOS: '🪡', TEXTIL: '👕', POR_CONFIRMAR: '📦',
};

export interface EditingOrder {
  id: string;
  client_id: string;
  service: ServiceType;
  description: string;
  meters: string;
  priceOverride: string;
  purchase_orders: PurchaseOrder[];
  bultos: string;
  photos: OrderPhoto[];
  newPhotos: string[];
}

interface EditCalc {
  subtotal: number;
  tax_pct: number;
  tax_amount: number;
  total_amount: number;
}

interface OrderEditPanelProps {
  editing: EditingOrder;
  loadingEditClient: boolean;
  clientMap: Record<string, Client>;
  orders: Order[];
  userRole?: string;
  collapsedSections: Record<string, boolean>;
  editAutoPrice: { price: number; isOverride: boolean } | null;
  editFinalPrice: number | null;
  editIsManualOverride: boolean | '' | null;
  editIsManualOnly: boolean | null;
  editCalc: EditCalc | null;
  editHasTiers: boolean;
  saving: boolean;
  onToggleSection: (key: string) => void;
  onEditChange: (editing: EditingOrder) => void;
  onSave: () => void;
  onClose: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSetError: (msg: string) => void;
  onMarkPaid: (order: Order) => void;
  onFacturar: (order: Order) => void;
  onDelete: (order: Order) => void;
}

export default function OrderEditPanel({
  editing, loadingEditClient, clientMap, orders, userRole,
  collapsedSections, editAutoPrice, editFinalPrice, editIsManualOverride, editIsManualOnly,
  editCalc, saving,
  onToggleSection, onEditChange, onSave, onClose, onImageUpload,
  onSetError, onMarkPaid, onFacturar, onDelete,
}: OrderEditPanelProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const currentOrder = orders.find(o => o.id === editing.id);

  return (
    <>
      <div className="eom-backdrop" onClick={onClose} />
      <div className="eom-panel">
        <div className="eom-header">
          <div className="eom-header-left">
            <span className="eom-order-badge">#{editing.id}</span>
            <h3>{clientMap[editing.client_id]?.name || '—'}</h3>
            <span className="eom-client-tag">{SERVICE_ICONS[editing.service] ?? '📋'} {editing.service.replace('_', ' ')}</span>
          </div>
          <button className="eom-close" onClick={onClose}>✕</button>
        </div>

        {loadingEditClient ? (
          <div className="eom-content">
            <div className="eom-form">
              <div className="eom-section"><div className="eom-section-body"><div className="eom-sk-block" style={{ height: 120 }} /></div></div>
              <div className="eom-section"><div className="eom-section-body"><div className="eom-sk-block" style={{ height: 80 }} /></div></div>
              <div className="eom-section"><div className="eom-section-body"><div className="eom-sk-block" style={{ height: 60 }} /></div></div>
            </div>
            <div className="eom-sidebar"><div className="eom-sk-block" style={{ height: 160 }} /></div>
          </div>
        ) : (
          <div className="eom-content">
            <div className="eom-form">
              {/* Service Section */}
              <div className={`eom-section${collapsedSections.service ? ' collapsed' : ''}`}>
                <div className="eom-section-header" onClick={() => onToggleSection('service')}>
                  <span className="eom-section-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
                    Servicio
                  </span>
                  <svg className="eom-section-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
                {!collapsedSections.service && (
                <div className="eom-section-body">
                  <div className="eom-service-grid">
                    {SERVICE_TYPES.map((s) => (
                      <button key={s} className={`eom-service-btn ${editing.service === s ? 'selected' : ''}`} onClick={() => onEditChange({ ...editing, service: s, priceOverride: '' })}>
                        <span className="eom-service-icon">{SERVICE_ICONS[s] ?? '📋'}</span>
                        <span>{s.replace('_', ' ')}</span>
                        <span className="eom-service-unit">por {unitLabel(s)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                )}
              </div>

              {/* Details Section */}
              <div className={`eom-section${collapsedSections.details ? ' collapsed' : ''}`}>
                <div className="eom-section-header" onClick={() => onToggleSection('details')}>
                  <span className="eom-section-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Detalles
                  </span>
                  <svg className="eom-section-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
                {!collapsedSections.details && (
                <div className="eom-section-body">
                  <div className="eom-details-grid three-col">
                    <div className="eom-field">
                      <label>{isPerCloth(editing.service) ? (editing.service === 'TEXTURIZADO' ? 'Paños' : 'Unidades') : 'Metros'}</label>
                      <input type="number" min={isPerCloth(editing.service) ? '1' : '0.1'} step={isPerCloth(editing.service) ? '1' : '0.1'} value={editing.meters} onChange={(e) => onEditChange({ ...editing, meters: e.target.value, priceOverride: '' })} placeholder="0" />
                    </div>
                    <div className="eom-field">
                      <label>Bultos</label>
                      <input type="number" min="0" step="1" value={editing.bultos} onChange={(e) => onEditChange({ ...editing, bultos: e.target.value })} placeholder="0" />
                    </div>
                    <div className="eom-field">
                      <label>Descripción</label>
                      <input type="text" value={editing.description} onChange={(e) => onEditChange({ ...editing, description: e.target.value })} placeholder="Opcional" />
                    </div>
                  </div>
                </div>
                )}
              </div>

              {/* Price Section */}
              {userRole !== 'operator' && (
              <div className={`eom-section${collapsedSections.price ? ' collapsed' : ''}`}>
                <div className="eom-section-header" onClick={() => onToggleSection('price')}>
                  <span className="eom-section-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    Precio
                  </span>
                  <div className="eom-section-header-right">
                    {editIsManualOverride && <span className="eom-override-badge">Override</span>}
                    <svg className="eom-section-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
                {!collapsedSections.price && (
                <div className="eom-section-body">
                  {!editIsManualOnly && editAutoPrice && (
                    <div className="eom-price-suggested">
                      <span>Sugerido: {formatCLP(editAutoPrice.price)}/{unitLabel(editing.service)}</span>
                      {editAutoPrice.isOverride && <span className="eom-override-badge">Especial</span>}
                    </div>
                  )}
                  <div className="eom-price-card">
                    <div className="eom-price-input-group">
                      <span className="eom-price-prefix">$</span>
                      <input type="number" min="1" step="1" value={editing.priceOverride} onChange={(e) => onEditChange({ ...editing, priceOverride: e.target.value })} placeholder={editAutoPrice ? String(editAutoPrice.price) : 'Ingrese precio'} />
                      <span className="eom-price-suffix">/{unitLabel(editing.service)}</span>
                    </div>
                    {editIsManualOverride && (
                      <div className="eom-price-actions">
                        <button className="btn-sm" onClick={() => onEditChange({ ...editing, priceOverride: '' })}>Usar sugerido</button>
                      </div>
                    )}
                  </div>
                </div>
                )}
              </div>
              )}

              {/* Purchase Orders Section */}
              {userRole !== 'operator' && (
              <div className={`eom-section${collapsedSections.po ? ' collapsed' : ''}`}>
                <div className="eom-section-header" onClick={() => onToggleSection('po')}>
                  <span className="eom-section-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    Órdenes de compra
                  </span>
                  <div className="eom-section-header-right">
                    {!collapsedSections.po && (
                      <button type="button" className="eom-po-add" onClick={(e) => { e.stopPropagation(); onEditChange({ ...editing, purchase_orders: [...editing.purchase_orders, { oc_number: '', date: '' }] }); }}>
                        + Agregar
                      </button>
                    )}
                    <svg className="eom-section-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
                {!collapsedSections.po && (
                <div className="eom-section-body">
                  {editing.purchase_orders.length === 0 && <span className="eom-po-empty">Sin órdenes de compra asociadas</span>}
                  {editing.purchase_orders.map((po, idx) => (
                    <div key={idx} className="eom-po-row">
                      <input type="text" className="eom-po-input eom-po-number" value={po.oc_number} onChange={(e) => { const updated = [...editing.purchase_orders]; updated[idx] = { ...updated[idx], oc_number: e.target.value }; onEditChange({ ...editing, purchase_orders: updated }); }} placeholder="Nº orden de compra" />
                      <input type="date" className="eom-po-input eom-po-date" value={po.date || ''} onChange={(e) => { const updated = [...editing.purchase_orders]; updated[idx] = { ...updated[idx], date: e.target.value || undefined }; onEditChange({ ...editing, purchase_orders: updated }); }} />
                      <button type="button" className="eom-po-remove" onClick={() => onEditChange({ ...editing, purchase_orders: editing.purchase_orders.filter((_, i) => i !== idx) })} title="Eliminar">✕</button>
                    </div>
                  ))}
                </div>
                )}
              </div>
              )}

              {/* Photos Section */}
              <div className={`eom-section${collapsedSections.photos ? ' collapsed' : ''}`}>
                <div className="eom-section-header" onClick={() => onToggleSection('photos')}>
                  <span className="eom-section-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    Fotos
                  </span>
                  <svg className="eom-section-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
                {!collapsedSections.photos && (
                <div className="eom-section-body">
                  {editing.photos.length > 0 && (
                    <div className="eom-photo-grid">
                      {editing.photos.map((photo) => (
                        <div key={photo.id} className="eom-photo-thumb" onClick={() => setLightboxSrc(photo.url)}>
                          <img src={photo.url} alt={photo.filename} />
                          <button className="eom-photo-remove" onClick={(e) => { e.stopPropagation(); onEditChange({ ...editing, photos: editing.photos.filter((p) => p.id !== photo.id) }); }} title="Eliminar">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {editing.newPhotos.length > 0 && (
                    <div className="eom-photo-grid">
                      {editing.newPhotos.map((src, idx) => (
                        <div key={`new-${idx}`} className="eom-photo-thumb" onClick={() => setLightboxSrc(src)}>
                          <img src={src} alt={`Nueva ${idx + 1}`} />
                          <button className="eom-photo-remove" onClick={(e) => { e.stopPropagation(); onEditChange({ ...editing, newPhotos: editing.newPhotos.filter((_, i) => i !== idx) }); }} title="Eliminar">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="eom-photo-upload-row">
                    <label className="eom-photo-upload-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      Tomar foto
                      <input type="file" accept="image/*" capture="environment" onChange={onImageUpload} hidden />
                    </label>
                    <label className="eom-photo-upload-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      Galería
                      <input type="file" accept="image/*" multiple onChange={onImageUpload} hidden />
                    </label>
                  </div>
                </div>
                )}
              </div>

              {/* Mobile-only quick actions */}
              {userRole !== 'operator' && (
              <div className="eom-section eom-mobile-quick">
                <div className="eom-section-header">
                  <span className="eom-section-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    Acciones rápidas
                  </span>
                </div>
                <div className="eom-section-body eom-mobile-quick-body">
                  <button className="eom-quick-btn" onClick={async () => { try { await downloadExcelExport([editing.id]); } catch { onSetError('Error exportando'); } }}>
                    📥 Exportar resumen
                  </button>
                  <button className="eom-quick-btn" onClick={async () => { try { await getCotizacionPdf(editing.id); } catch { onSetError('Error generando cotización'); } }}>📄 Cotización PDF</button>
                  {currentOrder && !currentOrder.is_paid && (
                    <button className="eom-quick-btn eom-quick-paid" onClick={() => { if (currentOrder) onMarkPaid(currentOrder); }}>✓ Marcar como pagada</button>
                  )}
                  {currentOrder && !currentOrder.invoice_id && (
                    <button className="eom-quick-btn eom-quick-facturar" onClick={() => { if (currentOrder) onFacturar(currentOrder); }}>🧾 Facturar</button>
                  )}
                  {currentOrder && !currentOrder.is_paid && !currentOrder.invoice_id && (
                    <button className="eom-quick-btn eom-quick-delete" onClick={() => { if (currentOrder) onDelete(currentOrder); }}>🗑 Eliminar orden</button>
                  )}
                </div>
              </div>
              )}
            </div>

            {/* Right: Sidebar */}
            <div className="eom-sidebar">
              <div className="eom-sidebar-card">
                <div className="eom-sidebar-card-title">Resumen</div>
                <div className="eom-sidebar-row"><span>Servicio</span><span>{SERVICE_ICONS[editing.service] ?? '📋'} {editing.service.replace('_', ' ')}</span></div>
                <div className="eom-sidebar-row"><span>Cantidad</span><span>{editing.meters || '—'} {unitLabel(editing.service)}</span></div>
                {editing.bultos && Number(editing.bultos) > 0 && <div className="eom-sidebar-row"><span>Bultos</span><span>{editing.bultos}</span></div>}
                {userRole !== 'operator' && <div className="eom-sidebar-row"><span>Precio unit.</span><span>{editFinalPrice ? formatCLP(editFinalPrice) : '—'}</span></div>}
                {editing.purchase_orders.filter(po => po.oc_number.trim()).length > 0 && <div className="eom-sidebar-row"><span>OC</span><span>{editing.purchase_orders.filter(po => po.oc_number.trim()).length}</span></div>}
                {userRole !== 'operator' && <div className="eom-sidebar-divider" />}
                {userRole !== 'operator' && editCalc ? (
                  <>
                    <div className="eom-sidebar-row"><span>Subtotal</span><span>{formatCLP(editCalc.subtotal)}</span></div>
                    <div className="eom-sidebar-row"><span>IVA 19%</span><span>{formatCLP(editCalc.tax_amount)}</span></div>
                    <div className="eom-sidebar-total"><span>Total</span><span>{formatCLP(editCalc.total_amount)}</span></div>
                  </>
                ) : userRole !== 'operator' ? (
                  <div className="eom-sidebar-row"><span>Total</span><span>—</span></div>
                ) : null}
              </div>

              {userRole !== 'operator' && (
              <div className="eom-sidebar-card eom-sidebar-quick">
                <div className="eom-sidebar-card-title">Acciones rápidas</div>
                <button className="eom-quick-btn" onClick={async () => { try { await downloadExcelExport([editing.id]); } catch { onSetError('Error exportando'); } }}>📥 Exportar resumen</button>
                <button className="eom-quick-btn" onClick={async () => { try { await getCotizacionPdf(editing.id); } catch { onSetError('Error generando cotización'); } }}>📄 Cotización PDF</button>
                {currentOrder && !currentOrder.is_paid && (
                  <button className="eom-quick-btn eom-quick-paid" onClick={() => { if (currentOrder) onMarkPaid(currentOrder); }}>✓ Marcar como pagada</button>
                )}
                {currentOrder && !currentOrder.invoice_id && (
                  <button className="eom-quick-btn eom-quick-facturar" onClick={() => { if (currentOrder) onFacturar(currentOrder); }}>🧾 Facturar</button>
                )}
                {currentOrder && !currentOrder.is_paid && !currentOrder.invoice_id && (
                  <button className="eom-quick-btn eom-quick-delete" onClick={() => { if (currentOrder) onDelete(currentOrder); }}>🗑 Eliminar orden</button>
                )}
              </div>
              )}

              <div className="eom-sidebar-actions">
                <button className="eom-btn-save" onClick={onSave} disabled={saving || (userRole !== 'operator' && !editCalc)}>
                  {saving ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                </button>
                <button className="eom-btn-cancel" onClick={onClose}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile sticky bottom bar */}
        <div className="eom-mobile-bar">
          <div className="eom-mobile-summary">
            {userRole !== 'operator' && (
            <div className="eom-mobile-summary-left">
              <span className="eom-mobile-summary-label">Total</span>
              <span className="eom-mobile-summary-total">{editCalc ? formatCLP(editCalc.total_amount) : '—'}</span>
            </div>
            )}
            <span className="eom-mobile-summary-detail">
              {editing.meters || '0'} {unitLabel(editing.service)}{userRole !== 'operator' ? ` · ${editFinalPrice ? formatCLP(editFinalPrice) : '—'}/${unitLabel(editing.service)}` : ''}
            </span>
          </div>
          <div className="eom-mobile-actions">
            <button className="eom-btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="eom-btn-save" onClick={onSave} disabled={saving || (userRole !== 'operator' && !editCalc)}>
              {saving ? '⏳ Guardando...' : '💾 Guardar'}
            </button>
          </div>
        </div>
      </div>
      {lightboxSrc && (
        <div className="eom-lightbox" onClick={() => setLightboxSrc(null)}>
          <button className="eom-lightbox-close" onClick={() => setLightboxSrc(null)}>✕</button>
          <img src={lightboxSrc} alt="Vista ampliada" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
