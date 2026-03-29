import type { ServiceType } from '../../../shared/types';
import { unitLabel } from '../../../shared/types';
import { formatCLP } from '../../../shared/lib/format';

interface SelectionSummary {
  byService: Record<string, { meters: number; total: number }>;
  grandTotal: number;
  count: number;
}

interface OrderSelectionBarProps {
  selectionSummary: SelectionSummary;
  selectedClientIds: string[];
  unpaidSelectedCount: number;
  facturableCount: number;
  exporting: boolean;
  generatingBulkPdf: boolean;
  markingPaid: boolean;
  previewLoading: boolean;
  onExportClick: () => void;
  onBulkCotizacion: () => void;
  onMarkPaidClick: () => void;
  onFacturarClick: () => void;
  onDeselect: () => void;
}

export default function OrderSelectionBar({
  selectionSummary, selectedClientIds, unpaidSelectedCount, facturableCount,
  exporting, generatingBulkPdf, markingPaid, previewLoading,
  onExportClick, onBulkCotizacion, onMarkPaidClick, onFacturarClick, onDeselect,
}: OrderSelectionBarProps) {
  return (
    <div className="selection-summary">
      <div className="ss-header">
        <span className="ss-count">{selectionSummary.count} orden{selectionSummary.count > 1 ? 'es' : ''} seleccionada{selectionSummary.count > 1 ? 's' : ''}</span>
        <div className="ss-actions">
          <button className="btn-export" onClick={onExportClick} disabled={exporting}>
            {exporting ? '⏳ Exportando...' : '📥 Exportar resumen'}
          </button>
          {selectedClientIds.length === 1 && (
            <button className="btn-cotizacion-bulk" onClick={onBulkCotizacion} disabled={generatingBulkPdf}>
              {generatingBulkPdf ? '⏳ Generando...' : '📄 Cotización PDF'}
            </button>
          )}
          {unpaidSelectedCount > 0 && (
            <button className="btn-mark-paid" onClick={onMarkPaidClick} disabled={markingPaid}>
              {markingPaid ? '⏳ Marcando...' : '✓ Marcar como pagadas'}
            </button>
          )}
          {facturableCount > 0 && (
            <button className="btn-facturar" onClick={onFacturarClick} disabled={previewLoading}>
              {previewLoading ? '⏳ Cargando preview...' : `🧾 Facturar (${facturableCount})`}
            </button>
          )}
          <button className="btn-sm" onClick={onDeselect}>Deseleccionar</button>
        </div>
      </div>
      <div className="ss-services">
        {Object.entries(selectionSummary.byService).map(([svc, data]) => (
          <div key={svc} className="ss-service-item">
            <span className="ss-service-name">{svc}</span>
            <span className="ss-service-qty">{data.meters} {unitLabel(svc as ServiceType)}</span>
            <span className="ss-service-total">{formatCLP(data.total)}</span>
          </div>
        ))}
      </div>
      <div className="ss-grand-total">
        <span>Total selección</span>
        <span className="ss-grand-amount">{formatCLP(selectionSummary.grandTotal)}</span>
      </div>
    </div>
  );
}
