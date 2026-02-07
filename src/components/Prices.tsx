import { useState } from 'react';
import { SERVICE_TYPES } from '../data/types';
import type { ServiceType } from '../data/types';
import { getDefaultPrices, updateDefaultPrice } from '../data/store';
import { formatCLP } from '../data/format';
import './Prices.css';

export default function Prices() {
  const [prices, setPrices] = useState(getDefaultPrices());
  const [editing, setEditing] = useState<ServiceType | null>(null);
  const [editValue, setEditValue] = useState('');
  const [feedback, setFeedback] = useState('');

  function startEdit(service: ServiceType) {
    setEditing(service);
    setEditValue(String(prices[service] ?? ''));
  }

  function saveEdit() {
    if (!editing) return;
    const num = Number(editValue);
    if (!editValue || num <= 0) {
      setFeedback('El precio debe ser mayor a 0');
      setTimeout(() => setFeedback(''), 3000);
      return;
    }
    updateDefaultPrice(editing, num);
    setPrices(getDefaultPrices());
    setFeedback(`Precio de ${editing} actualizado a ${formatCLP(num)}/m`);
    setTimeout(() => setFeedback(''), 3000);
    setEditing(null);
  }

  function cancelEdit() {
    setEditing(null);
    setEditValue('');
  }

  return (
    <div className="prices-view">
      <p className="prices-desc">Estos precios se aplican cuando un cliente no tiene precio preferencial configurado.</p>

      {feedback && <div className="feedback-msg">{feedback}</div>}

      <div className="price-cards">
        {SERVICE_TYPES.map((s) => (
          <div key={s} className={`price-card ${editing === s ? 'editing' : ''}`}>
            <div className="price-card-header">
              <span className="price-service">{s}</span>
            </div>
            {editing === s ? (
              <div className="price-edit">
                <div className="price-input-wrap">
                  <span className="price-prefix">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                    autoFocus
                  />
                  <span className="price-suffix">/m</span>
                </div>
                <div className="price-edit-actions">
                  <button className="btn-primary" onClick={saveEdit}>Guardar</button>
                  <button className="btn-sm" onClick={cancelEdit}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="price-display" onClick={() => startEdit(s)}>
                <span className="price-amount">{formatCLP(prices[s] ?? 0)}</span>
                <span className="price-unit">por metro</span>
                <button className="btn-sm">Editar</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
