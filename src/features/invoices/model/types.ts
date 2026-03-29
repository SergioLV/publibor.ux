export type InvoiceStatus = 'pending' | 'emitted' | 'accepted' | 'rejected' | 'error';

export interface Invoice {
  id: number;
  client_id: number;
  folio: number | null;
  tipo_dte: number;
  fecha_emision: string | null;
  monto_neto: number;
  iva: number;
  monto_total: number;
  fma_pago: number;
  fch_venc: string | null;
  status: InvoiceStatus;
  estado_sii: string | null;
  order_ids: number[];
  created_at: string;
  error_message?: string;
  last_resend?: string | null;
}
