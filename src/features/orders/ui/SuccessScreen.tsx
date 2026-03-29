import { motion } from 'framer-motion';
import type { Client } from '../../clients/model/types';

interface Props {
  selectedClient: Client | null;
  onViewOrders: () => void;
  onCreateAnother: () => void;
  onCreateForSameClient: () => void;
}

export default function SuccessScreen({ selectedClient, onViewOrders, onCreateAnother, onCreateForSameClient }: Props) {
  return (
    <div className="no-layout">
      <motion.div className="success-box" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
        <div className="success-check-wrap">
          <svg className="success-check" viewBox="0 0 52 52" fill="none">
            <motion.circle cx="26" cy="26" r="24" stroke="var(--color-primary)" strokeWidth="2.5" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }} />
            <motion.path d="M15 27l7 7 15-15" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.4, ease: 'easeOut' }} />
          </svg>
          {[...Array(8)].map((_, i) => (
            <motion.span key={i} className="success-particle" style={{ '--angle': `${i * 45}deg` } as React.CSSProperties} initial={{ opacity: 1, scale: 0 }} animate={{ opacity: 0, scale: 1 }} transition={{ duration: 0.6, delay: 0.45, ease: 'easeOut' }} />
          ))}
        </div>
        <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.3 }}>Orden creada</motion.h2>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.3 }}>La orden ha sido registrada exitosamente.</motion.p>
        <motion.div className="success-actions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.3 }}>
          <button className="btn-primary" onClick={onViewOrders}>Ver Órdenes</button>
          {selectedClient && <button className="btn-primary" onClick={onCreateForSameClient}>Crear otra orden para {selectedClient.name}</button>}
          <button className="btn-ghost" onClick={onCreateAnother}>Crear otra</button>
        </motion.div>
      </motion.div>
    </div>
  );
}
