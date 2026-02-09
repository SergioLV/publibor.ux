import { useState, useEffect, useMemo } from 'react';
import type { PriceTier, ServiceType } from '../data/types';
import { SERVICE_TYPES, unitLabel, isPerCloth } from '../data/types';
import { fetchDefaultPrices, updateDefaultPriceTier } from '../data/api';
import { formatCLP } from '../data/format';
import './Prices.css';

const SERVICE_META: Record<ServiceType, { icon: string; desc: string }> = {
  DTF: { icon: '🎨', desc: 'Impresión directa a film' },
  SUBLIMACION: { icon: '🔥', desc: 'Sublimación por calor' },
  UV: { icon: '💡', desc: 'Impresión UV directa' },
  TEXTURIZADO: { icon: '🧵', desc: 'Texturizado por paño' },
};

function tierRangeLabel(tier: PriceTier): string {
  if (tier.min_meters === 0 && tier.max_meters === null) return 'Cualquier cantidad';
  if (tier.max_meters === null) return `${tier.min_meters}+`;
  if (tier.min_meters === tier.max_meters) return `${tier.min_meters}`;
  return `${tier.min_meters} – ${tier.max_meters}`;
}

export default function Prices() {
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDefaultPrices()
      .then(setTiers)
      .catch(() => setFeedback('Error cargando precios'))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const map: Partial<Record<ServiceType, PriceTier[]>> = {};
    for (const s of SERVICE_TYPES) {
      const st = tiers.filter((t) => t.service === s).sort((a, b) => a.min_meters - b.min_meters);
      if (st.length > 0) map[s] = st;
    }
    return map;
  }, [tiers]);

  function startEdit(tier: PriceTier) {
    setEditingId(tier.id);
    setEditValue(String(tier.price));
  }

  async function saveEdit(tier: PriceTier) {
    const num = Number(editValue);
    if (!editValue || num <= 0) {
      setFeedback('El precio debe ser mayor a 0');
      setTimeout(() => setFeedback(''), 3000);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateDefaultPriceTier({
        service: tier.service,
        min_meters: tier.min_meters,
        max_meters: tier.max_meters,
        price: num,
      });
      setTiers((prev) => prev.map((t) => (t.id === tier.id ? updated : t)));
      setFeedback(`Precio actualizado: ${tier.service} → ${formatCLP(num)}`);
      setTimeout(() => setFeedback(''), 3000);
      setEditingId(null);
    } catch {
      setFeedback('Error guardando precio');
      setTimeout(() => setFeedback(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
  }

  if (loading) {
    return (
      <div className="prices-page">
        <div className="prices-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="price-card skeleton-card">
              <div className="pc-header"><span className="skeleton-block sk-title" /></div>
              <div className="pc-body">
                <div className="skeleton-block sk-row" />
                <div className="skeleton-block sk-row" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="prices-page">
      <p className="prices-subtitle">
        Precios base por servicio. Se aplican cuando el cliente no tiene precio preferencial.
      </p>

      {feedback && <div className="prices-feedback">{feedback}</div>}

      <div className="prices-grid">
        {SERVICE_TYPES.map((service) => {
          const serviceTiers = grouped[service];
          if (!serviceTiers) return null;
          const meta = SERVICE_META[service];
          const unit = unitLabel(service);
          const perCloth = isPerCloth(service);

          return (
            <div key={service} className="price-card">
              <div className="pc-header">
                <span className="pc-icon">{meta.icon}</span>
                <div className="pc-header-text">
                  <span className="pc-service-name">{service}</span>
                  <span className="pc-service-desc">{meta.desc}</span>
                </div>
                <span className="pc-unit-badge">por {unit}</span>
              </div>

              <div className="pc-body">
                {serviceTiers.length > 1 && (
                  <div className="pc-tier-header">
                    <span>Rango</span>
                    <span>Precio</span>
                  </div>
                )}
                {serviceTiers.map((tier) => (
                  <div key={tier.id} className={`pc-tier ${editingId === tier.id ? 'editing' : ''}`}>
                    <span className="pc-tier-range">
                      {perCloth || (tier.min_meters === 0 && tier.max_meters === null)
                        ? 'Precio único'
                        : <>{tierRangeLabel(tier)} <span className="pc-tier-unit">{unit}</span></>
                      }
                    </span>

                    {editingId === tier.id ? (
                      <div className="pc-tier-edit">
                        <div className="pc-edit-input">
                          <span className="pc-prefix">$</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(tier);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            autoFocus
                            disabled={saving}
                          />
                        </div>
                        <div className="pc-edit-actions">
                          <button className="pc-btn save" onClick={() => saveEdit(tier)} disabled={saving}>
                            {saving ? '...' : '✓'}
                          </button>
                          <button className="pc-btn cancel" onClick={cancelEdit}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <span className="pc-tier-price" onClick={() => startEdit(tier)} title="Click para editar">
                        {formatCLP(tier.price)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
