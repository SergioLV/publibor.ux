import type { PriceTier } from '../../prices/model/types';
import type { ServiceType } from '../../../shared/types';
import { SERVICE_TYPES, unitLabel } from '../../../shared/types';
import { formatCLP } from '../../../shared/lib/format';

function tierRangeLabel(tier: PriceTier): string {
  if (tier.min_meters === 0 && tier.max_meters === null) return 'Cualquier';
  if (tier.max_meters === null) return `${tier.min_meters}+`;
  return `${tier.min_meters}–${tier.max_meters}`;
}

interface Props {
  tiersGrouped: Partial<Record<ServiceType, PriceTier[]>>;
  openAccordion: ServiceType | null;
  onToggle: (s: ServiceType | null) => void;
  getEditPrice: (tierId: number) => number | '';
  setEditPrice: (tierId: number, val: string) => void;
}

export default function ClientPriceAccordion({ tiersGrouped, openAccordion, onToggle, getEditPrice, setEditPrice }: Props) {
  return (
    <div className="modal-section">
      <div className="section-label">Precios preferenciales</div>
      <p className="prices-hint">Solo si el cliente tiene tarifa especial. Vacío = precio por defecto.</p>
      <div className="pref-services">
        {SERVICE_TYPES.map((service) => {
          const serviceTiers = tiersGrouped[service] || [];
          if (serviceTiers.length === 0) return null;
          const isOpen = openAccordion === service;
          const overrideCount = serviceTiers.filter((t) => { const v = getEditPrice(t.id); return v !== '' && Number(v) > 0; }).length;
          return (
            <div key={service} className={`pref-service-card ${isOpen ? 'pref-open' : ''}`}>
              <button type="button" className="pref-card-header pref-card-toggle" onClick={() => onToggle(isOpen ? null : service)}>
                <div className="pref-card-header-left">
                  <span className={`pref-chevron ${isOpen ? 'pref-chevron-open' : ''}`}>›</span>
                  <span className="pref-card-service">{service}</span>
                  <span className="pref-card-unit">por {unitLabel(service)}</span>
                </div>
                {overrideCount > 0 && <span className="pref-override-count">{overrideCount} especial{overrideCount > 1 ? 'es' : ''}</span>}
              </button>
              {isOpen && (
                <div className="pref-card-tiers">
                  {serviceTiers.map((tier) => {
                    const val = getEditPrice(tier.id);
                    const hasOverride = val !== '' && Number(val) > 0;
                    return (
                      <div key={tier.id} className={`pref-tier-row ${hasOverride ? 'has-override' : ''}`}>
                        <div className="pref-tier-info">
                          <span className="pref-tier-range">{tierRangeLabel(tier)} {unitLabel(service)}</span>
                          <span className="pref-tier-default">Base: {formatCLP(tier.price)}</span>
                        </div>
                        <div className="pref-tier-input-wrap">
                          <span className="pref-input-prefix">$</span>
                          <input type="number" min="0" step="1" value={val} onChange={(e) => setEditPrice(tier.id, e.target.value)} placeholder={String(tier.price)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
