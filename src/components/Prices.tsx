import { useState, useEffect, useMemo } from 'react';
import type { PriceTier, ServiceType } from '../data/types';
import { SERVICE_TYPES, unitLabel } from '../data/types';
import { fetchDefaultPrices, updateDefaultPriceTier } from '../data/api';
import { formatCLP } from '../data/format';
import './Prices.css';

function tierRangeLabel(tier: PriceTier): string {
  if (tier.min_meters === 0 && tier.max_meters === null) return 'Cualquier cantidad';
  if (tier.max_meters === null) return `${tier.min_meters}+ ${unitLabel(tier.service)}`;
  return `${tier.min_meters}–${tier.max_meters} ${unitLabel(tier.service)}`;
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
      map[s] = tiers
        .filter((t) => t.service === s)
        .sort((a, b) => a.min_meters - b.min_meters);
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
      setFeedback(`${tier.service} ${tierRangeLabel(tier)} actualizado a ${formatCLP(num)}`);
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
      <div className="prices-view">
        <p className="prices-desc">Cargando precios...</p>
      </div>
    );
  }

  return (
    <div className="prices-view">
      <p className="prices-desc">Precios por defecto por servicio y rango. Se aplican cuando el cliente no tiene precio preferencial.</p>

      {feedback && <div className="feedback-msg">{feedback}</div>}

      {SERVICE_TYPES.map((service) => {
        const serviceTiers = grouped[service] || [];
        if (serviceTiers.length === 0) return null;
        return (
          <div key={service} className="price-service-group">
            <h3 className="price-service-title">{service}</h3>
            <div className="price-tiers">
              {serviceTiers.map((tier) => (
                <div key={tier.id} className={`price-tier ${editingId === tier.id ? 'editing' : ''}`}>
                  <span className="tier-range">{tierRangeLabel(tier)}</span>
                  {editingId === tier.id ? (
                    <div className="tier-edit">
                      <div className="price-input-wrap">
                        <span className="price-prefix">$</span>
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
                        <span className="price-suffix">/{unitLabel(service)}</span>
                      </div>
                      <button className="btn-primary btn-sm" onClick={() => saveEdit(tier)} disabled={saving}>
                        {saving ? '...' : 'Guardar'}
                      </button>
                      <button className="btn-sm" onClick={cancelEdit}>Cancelar</button>
                    </div>
                  ) : (
                    <div className="tier-display" onClick={() => startEdit(tier)}>
                      <span className="tier-price">{formatCLP(tier.price)}/{unitLabel(service)}</span>
                      <button className="btn-sm">Editar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
