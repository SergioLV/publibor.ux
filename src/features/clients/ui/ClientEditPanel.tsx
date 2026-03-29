import type { PriceTier } from '../../prices/model/types';
import type { ServiceType } from '../../../shared/types';
import ClientPriceAccordion from './ClientPriceAccordion';

export interface EditingClient {
  id: string;
  name: string;
  rut: string;
  email: string;
  phone: string;
  billing_addr: string;
  giro: string;
  comuna: string;
  ciudad: string;
  is_active: boolean;
  prices: { default_price_id: number; price: number | '' }[];
}

function clientInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

interface Props {
  editing: EditingClient;
  isNew: boolean;
  saving: boolean;
  loadingEdit: boolean;
  tiersGrouped: Partial<Record<ServiceType, PriceTier[]>>;
  openAccordion: ServiceType | null;
  onToggleAccordion: (s: ServiceType | null) => void;
  onChange: (e: EditingClient) => void;
  onClose: () => void;
  onSave: () => void;
  getEditPrice: (tierId: number) => number | '';
  setEditPrice: (tierId: number, val: string) => void;
}

export default function ClientEditPanel({
  editing, isNew, saving, loadingEdit, tiersGrouped, openAccordion,
  onToggleAccordion, onChange, onClose, onSave, getEditPrice, setEditPrice,
}: Props) {
  const set = (field: string, val: string | boolean) => onChange({ ...editing, [field]: val });

  return (
    <>
      <div className="cl-panel-backdrop" onClick={() => { if (!loadingEdit) onClose(); }} />
      <div className="cl-panel">
        <div className="cl-panel-header">
          <div className="cl-panel-header-left">
            {!isNew && <span className="cl-avatar">{clientInitials(editing.name || '?')}</span>}
            <h3>{isNew ? 'Nuevo Cliente' : editing.name || 'Cliente'}</h3>
            {!isNew && <span className={`status-badge ${editing.is_active ? 'active' : 'inactive'}`}>{editing.is_active ? 'Activo' : 'Inactivo'}</span>}
          </div>
          <button className="cl-panel-close" onClick={onClose}>✕</button>
        </div>

        <div className="cl-panel-body">
          {loadingEdit ? (
            <>
              <div className="modal-section">
                <div className="section-label">Información general</div>
                <div className="form-grid">
                  <label className="span-2">Nombre *<span className="skeleton-input" /></label>
                  <label>RUT<span className="skeleton-input" /></label>
                  <label>Giro<span className="skeleton-input" /></label>
                  <label>Email<span className="skeleton-input" /></label>
                  <label>Teléfono<span className="skeleton-input" /></label>
                  <label className="span-2">Dirección facturación<span className="skeleton-input" /></label>
                  <label>Comuna<span className="skeleton-input" /></label>
                  <label>Ciudad<span className="skeleton-input" /></label>
                </div>
              </div>
              <div className="modal-section">
                <div className="section-label">Precios preferenciales</div>
                <div className="pref-services">
                  {[1, 2, 3].map((i) => (<div key={i} className="skeleton-accordion"><div className="skeleton-accordion-bar" /></div>))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="modal-section">
                <div className="section-label">Información general</div>
                <div className="form-grid">
                  <label className="span-2">Nombre *<input value={editing.name} onChange={(e) => set('name', e.target.value)} placeholder="Nombre de la empresa" /></label>
                  <label>RUT<input value={editing.rut} onChange={(e) => set('rut', e.target.value)} placeholder="12.345.678-9" /></label>
                  <label>Giro<input value={editing.giro} onChange={(e) => set('giro', e.target.value)} placeholder="Servicios de impresión" /></label>
                  <label>Email<input value={editing.email} onChange={(e) => set('email', e.target.value)} placeholder="contacto@empresa.cl" /></label>
                  <label>Teléfono<input value={editing.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+56 9 1234 5678" /></label>
                  <label className="span-2">Dirección facturación<input value={editing.billing_addr} onChange={(e) => set('billing_addr', e.target.value)} placeholder="Av. Principal 123" /></label>
                  <label>Comuna<input value={editing.comuna} onChange={(e) => set('comuna', e.target.value)} placeholder="Santiago" /></label>
                  <label>Ciudad<input value={editing.ciudad} onChange={(e) => set('ciudad', e.target.value)} placeholder="Santiago" /></label>
                </div>
                {!isNew && (
                  <label className="active-toggle">
                    <input type="checkbox" checked={editing.is_active} onChange={(e) => set('is_active', e.target.checked)} />
                    <span className={`toggle-label ${editing.is_active ? 'on' : 'off'}`}>{editing.is_active ? 'Cliente activo' : 'Cliente inactivo'}</span>
                  </label>
                )}
              </div>
              <ClientPriceAccordion tiersGrouped={tiersGrouped} openAccordion={openAccordion} onToggle={onToggleAccordion} getEditPrice={getEditPrice} setEditPrice={setEditPrice} />
            </>
          )}
        </div>

        <div className="cl-panel-footer">
          <button className="cl-panel-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={onSave} disabled={saving || !editing.name.trim()}>
            {saving ? 'Guardando...' : isNew ? 'Crear Cliente' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </>
  );
}
