import type { Order } from '../model/types';
import type { Client } from '../../clients/model/types';
import { unitLabel } from '../../../shared/types';
import { formatCLP } from '../../../shared/lib/format';

interface FacturarModalProps {
  facturableOrders: Order[];
  clientMap: Record<string, Client>;
  facturarClientIds: string[];
  facturarClientMissing: string[] | null;
  previewUrl: string | null;
  previewLoading: boolean;
  fmaPago: 1 | 2;
  diasVencimiento: number;
  facturando: boolean;
  onFmaPagoChange: (v: 1 | 2) => void;
  onDiasVencimientoChange: (v: number) => void;
  onEmitir: () => void;
  onCancel: () => void;
  onNavigateClients: () => void;
}

export default function FacturarModal({
  facturableOrders, clientMap, facturarClientIds, facturarClientMissing,
  previewUrl, previewLoading, fmaPago, diasVencimiento, facturando,
  onFmaPagoChange, onDiasVencimientoChange, onEmitir, onCancel, onNavigateClients,
}: FacturarModalProps) {
  const clientId = facturarClientIds[0];
  const client = clientMap[clientId];

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="facturar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fm-header">
          <div className="fm-header-left">
            <img src="/images/sii.png" alt="SII" className="fm-sii-logo" />
            <div>
              <h3>Emitir Factura Electrónica</h3>
              <span className="fm-subtitle">Tipo 33 — {client?.name || '—'}</span>
            </div>
          </div>
          <button className="eom-close" onClick={onCancel}>✕</button>
        </div>
        <div className="fm-content">
          <div className="fm-preview-pane">
            {previewLoading && (
              <div className="fm-preview-loading"><span>⏳ Cargando preview...</span></div>
            )}
            {previewUrl && (
              <iframe src={previewUrl} className="fm-preview-iframe" title="Preview factura" />
            )}
          </div>
          <div className="fm-details-pane">
            <div className="fm-client-info">
              <div className="fm-ci-row"><span>RUT</span><span>{client?.rut || '—'}</span></div>
              <div className="fm-ci-row"><span>Dirección</span><span>{client?.billing_addr || '—'}</span></div>
            </div>
            <div className="fm-items">
              <div className="fm-items-header">
                <span>Orden</span><span>Servicio</span><span>Cantidad</span><span>Total</span>
              </div>
              {facturableOrders.map((o) => (
                <div key={o.id} className="fm-item-row">
                  <span>#{o.id}</span>
                  <span>{o.service}</span>
                  <span>{o.meters} {unitLabel(o.service)}</span>
                  <span>{formatCLP(o.total_amount)}</span>
                </div>
              ))}
            </div>
            <div className="fm-totals">
              <div className="fm-total-row"><span>Neto</span><span>{formatCLP(facturableOrders.reduce((s, o) => s + o.subtotal, 0))}</span></div>
              <div className="fm-total-row"><span>IVA 19%</span><span>{formatCLP(facturableOrders.reduce((s, o) => s + o.tax_amount, 0))}</span></div>
              <div className="fm-total-row grand"><span>Total</span><span>{formatCLP(facturableOrders.reduce((s, o) => s + o.total_amount, 0))}</span></div>
            </div>
            <div className="fm-pago-section">
              <label className="fm-pago-label">Forma de pago</label>
              <div className="fm-pago-options">
                <button className={`fm-pago-btn ${fmaPago === 1 ? 'selected' : ''}`} onClick={() => onFmaPagoChange(1)}>Contado</button>
                <button className={`fm-pago-btn ${fmaPago === 2 ? 'selected' : ''}`} onClick={() => onFmaPagoChange(2)}>Crédito</button>
              </div>
              {fmaPago === 2 && (
                <div className="fm-pago-dias">
                  <label>Días de vencimiento</label>
                  <input type="number" min="1" value={diasVencimiento} onChange={(e) => onDiasVencimientoChange(Math.max(1, Number(e.target.value)))} />
                  <span className="fm-pago-venc-date">
                    Vence: {(() => { const d = new Date(); d.setDate(d.getDate() + diasVencimiento); return d.toISOString().split('T')[0]; })()}
                  </span>
                </div>
              )}
            </div>
            <div className="fm-actions">
              {facturarClientMissing ? (
                <>
                  <div className="fm-missing-warning">
                    <span className="fm-missing-text">
                      ⚠️ No se puede emitir la factura, ya que los siguientes datos del cliente no están registrados: {facturarClientMissing.join(', ')}
                    </span>
                  </div>
                  <div className="fm-actions-row">
                    <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
                    <button className="btn-primary" onClick={onNavigateClients}>Ir a Clientes</button>
                  </div>
                </>
              ) : (
                <div className="fm-actions-row">
                  <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
                  <button className="btn-facturar-emit" onClick={onEmitir} disabled={facturando}>
                    {facturando ? '⏳ Emitiendo...' : '🧾 Emitir Factura'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
