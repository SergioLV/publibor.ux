import { useState } from 'react';
import type { ServiceType } from '../../../shared/types';
import { unitLabel } from '../../../shared/types';

const SERVICE_ICONS: Record<string, string> = {
  DTF: '🖨️', SUBLIMACION: '🎨', UV: '💎', TEXTURIZADO: '🧵',
  LASER_CO2: '🔥', LASER_FIBRA: '⚡', BORDADOS: '🪡', TEXTIL: '👕', POR_CONFIRMAR: '📦',
};

const ALL_SERVICES: ServiceType[] = ['DTF', 'SUBLIMACION', 'UV', 'TEXTURIZADO', 'LASER_CO2', 'LASER_FIBRA', 'BORDADOS', 'TEXTIL'];

interface Props {
  active: boolean;
  service: ServiceType | '';
  onSelect: (s: ServiceType) => void;
  onClear: () => void;
}

export default function ServiceStep({ active, service, onSelect, onClear }: Props) {
  const [showMore, setShowMore] = useState(false);

  if (active) {
    return (
      <div className="no-card card-active card-enter">
        <div className="no-card-head">
          <span className="no-card-num">2</span>
          <span className="no-card-title title-active">Tipo de servicio</span>
        </div>
        {!showMore ? (
          <div className="service-grid service-grid-2">
            <button className="service-option so-quick" onClick={() => onSelect('POR_CONFIRMAR')}>
              <span className="so-icon">📦</span><span className="so-name">Por confirmar</span><span className="so-unit">orden rápida</span>
            </button>
            <button className="service-option so-more" onClick={() => setShowMore(true)}>
              <span className="so-icon">➕</span><span className="so-name">Otro</span><span className="so-unit">elegir servicio</span>
            </button>
          </div>
        ) : (
          <>
            <button className="so-back-btn" onClick={() => setShowMore(false)}>← Volver</button>
            <div className="service-grid">
              {ALL_SERVICES.map((s) => (
                <button key={s} className={`service-option ${service === s ? 'selected' : ''}`} onClick={() => onSelect(s)}>
                  <span className="so-icon">{SERVICE_ICONS[s] ?? '📋'}</span>
                  <span className="so-name">{s.replace('_', ' ')}</span>
                  <span className="so-unit">por {unitLabel(s)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (service) {
    return (
      <div className="no-card card-collapsed" onClick={onClear}>
        <div className="collapsed-row">
          <span className="no-card-num">✓</span>
          <span className="collapsed-label">Servicio</span>
          <span className="collapsed-value">
            <span className="collapsed-service-icon">{SERVICE_ICONS[service] ?? '📋'}</span>
            {service === 'POR_CONFIRMAR' ? 'Por confirmar' : service}
          </span>
          <button className="collapsed-change" onClick={(e) => { e.stopPropagation(); onClear(); }}>Cambiar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="no-card card-pending">
      <div className="collapsed-row">
        <span className="no-card-num">2</span>
        <span className="collapsed-label dim">Tipo de servicio</span>
        <span className="pending-hint">Elige servicio</span>
      </div>
    </div>
  );
}
