import type { ServiceType } from '../../../shared/types';
import type { PriceTier } from '../model/types';
import { unitLabel, isPerCloth } from '../../../shared/types';
import { formatCLP } from '../../../shared/lib/format';

const SERVICE_META: Record<ServiceType, { icon: string; desc: string; accent: string; accentDim: string }> = {
  DTF: { icon: '🖨️', desc: 'Impresión directa a film', accent: '#818cf8', accentDim: 'rgba(99,102,241,0.1)' },
  SUBLIMACION: { icon: '🎨', desc: 'Sublimación por calor', accent: '#f472b6', accentDim: 'rgba(244,114,182,0.1)' },
  UV: { icon: '💎', desc: 'Impresión UV directa', accent: '#38bdf8', accentDim: 'rgba(56,189,248,0.1)' },
  TEXTURIZADO: { icon: '🧵', desc: 'Texturizado por paño', accent: '#fbbf24', accentDim: 'rgba(251,191,36,0.1)' },
  LASER_CO2: { icon: '🔥', desc: 'Corte láser CO2 por unidad', accent: '#ef4444', accentDim: 'rgba(239,68,68,0.1)' },
  LASER_FIBRA: { icon: '⚡', desc: 'Grabado láser fibra por unidad', accent: '#f97316', accentDim: 'rgba(249,115,22,0.1)' },
  BORDADOS: { icon: '🪡', desc: 'Bordado por unidad', accent: '#a855f7', accentDim: 'rgba(168,85,247,0.1)' },
  TEXTIL: { icon: '👕', desc: 'Textil por unidad', accent: '#14b8a6', accentDim: 'rgba(20,184,166,0.1)' },
  POR_CONFIRMAR: { icon: '📦', desc: 'Por confirmar', accent: '#6b7280', accentDim: 'rgba(107,114,128,0.1)' },
};

function tierRangeLabel(tier: PriceTier): string {
  if (tier.min_meters === 0 && tier.max_meters === null) return 'Cualquier cantidad';
  if (tier.max_meters === null) return `${tier.min_meters}+`;
  if (tier.min_meters === tier.max_meters) return `${tier.min_meters}`;
  return `${tier.min_meters} – ${tier.max_meters}`;
}

interface Props {
  service: ServiceType;
  tiers: PriceTier[];
  editingId: number | null;
  editValue: string;
  saving: boolean;
  onStartEdit: (tier: PriceTier) => void;
  onSaveEdit: (tier: PriceTier) => void;
  onCancelEdit: () => void;
  onEditValueChange: (val: string) => void;
}

export default function PriceCard({
  service, tiers, editingId, editValue, saving,
  onStartEdit, onSaveEdit, onCancelEdit, onEditValueChange,
}: Props) {
  const meta = SERVICE_META[service];
  const unit = unitLabel(service);
  const perCloth = isPerCloth(service);

  return (
    <div
      className="price-card"
      style={{ '--card-accent': meta.accent, '--card-accent-dim': meta.accentDim } as React.CSSProperties}
    >
      <div className="pc-header">
        <span className="pc-icon-wrap">{meta.icon}</span>
        <div className="pc-header-text">
          <span className="pc-service-name">{service}</span>
          <span className="pc-service-desc">{meta.desc}</span>
        </div>
        <span className="pc-unit-badge">por {unit}</span>
      </div>

      <div className="pc-body">
        {tiers.length > 1 && (
          <div className="pc-tier-header"><span>Rango</span><span>Precio</span></div>
        )}
        {tiers.map((tier, idx) => (
          <div key={tier.id} className={`pc-tier${editingId === tier.id ? ' editing' : ''}${idx % 2 === 1 ? ' striped' : ''}`}>
            <div className="pc-tier-left">
              <span className="pc-tier-dot" />
              <span className="pc-tier-range">
                {perCloth || (tier.min_meters === 0 && tier.max_meters === null)
                  ? 'Precio único'
                  : <>{tierRangeLabel(tier)} <span className="pc-tier-unit">{unit}</span></>}
              </span>
            </div>

            {editingId === tier.id ? (
              <div className="pc-tier-edit">
                <div className="pc-edit-input">
                  <span className="pc-prefix">$</span>
                  <input
                    type="number" min="1" step="1" value={editValue}
                    onChange={(e) => onEditValueChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onSaveEdit(tier); if (e.key === 'Escape') onCancelEdit(); }}
                    autoFocus disabled={saving}
                  />
                </div>
                <div className="pc-edit-actions">
                  <button className="pc-btn save" onClick={() => onSaveEdit(tier)} disabled={saving} title="Guardar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <button className="pc-btn cancel" onClick={onCancelEdit} title="Cancelar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            ) : (
              <button className="pc-tier-price" onClick={() => onStartEdit(tier)} title="Click para editar">
                {formatCLP(tier.price)}
                <svg className="pc-edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
