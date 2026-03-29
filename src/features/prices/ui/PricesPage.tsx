import { useState, useMemo } from 'react';
import type { ServiceType } from '../../../shared/types';
import type { PriceTier } from '../model/types';
import { SERVICE_TYPES } from '../../../shared/types';
import { formatCLP } from '../../../shared/lib/format';
import { useDefaultPrices, useUpdatePriceTier } from '../api/hooks';
import PriceCard from './PriceCard';
import './Prices.css';

export default function PricesPage() {
  const { data: tiers = [], isLoading: loading } = useDefaultPrices();
  const updateTier = useUpdatePriceTier();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [feedback, setFeedback] = useState('');

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

  function saveEdit(tier: PriceTier) {
    const num = Number(editValue);
    if (!editValue || num <= 0) {
      setFeedback('El precio debe ser mayor a 0');
      setTimeout(() => setFeedback(''), 3000);
      return;
    }
    updateTier.mutate(
      { service: tier.service, min_meters: tier.min_meters, max_meters: tier.max_meters, price: num },
      {
        onSuccess: () => {
          setFeedback(`Precio actualizado: ${tier.service} → ${formatCLP(num)}`);
          setTimeout(() => setFeedback(''), 3000);
          setEditingId(null);
        },
        onError: () => {
          setFeedback('Error guardando precio');
          setTimeout(() => setFeedback(''), 3000);
        },
      },
    );
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
              <div className="pc-header">
                <div className="skeleton-block sk-icon" />
                <div className="sk-header-lines">
                  <span className="skeleton-block sk-title" />
                  <span className="skeleton-block sk-desc" />
                </div>
              </div>
              <div className="pc-body">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="sk-tier-row">
                    <span className="skeleton-block sk-range" />
                    <span className="skeleton-block sk-price" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="prices-page fade-in">
      <p className="prices-subtitle">
        Precios base por servicio. Se aplican cuando el cliente no tiene precio preferencial.
      </p>

      {feedback && (
        <div className={`prices-feedback${feedback.startsWith('Error') ? ' error' : ''}`}>
          <span className="feedback-icon">{feedback.startsWith('Error') ? '✕' : '✓'}</span>
          {feedback}
        </div>
      )}

      <div className="prices-grid">
        {SERVICE_TYPES.map((service) => {
          const serviceTiers = grouped[service];
          if (!serviceTiers) return null;
          return (
            <PriceCard
              key={service}
              service={service}
              tiers={serviceTiers}
              editingId={editingId}
              editValue={editValue}
              saving={updateTier.isPending}
              onStartEdit={startEdit}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
              onEditValueChange={setEditValue}
            />
          );
        })}
      </div>
    </div>
  );
}
