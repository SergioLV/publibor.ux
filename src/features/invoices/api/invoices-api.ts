import { apiFetch, blobUrlFromBase64 } from '../../../shared/api';
import type { Invoice, InvoiceStatus } from '../model/types';

interface ApiInvoice {
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
  status: string;
  estado_sii: string | null;
  order_ids: number[];
  created_at: string;
  error_message?: string;
  last_resend?: string | null;
}

function mapApiInvoice(api: ApiInvoice): Invoice {
  return {
    id: api.id,
    client_id: api.client_id,
    folio: api.folio,
    tipo_dte: api.tipo_dte,
    fecha_emision: api.fecha_emision,
    monto_neto: api.monto_neto,
    iva: api.iva,
    monto_total: api.monto_total,
    fma_pago: api.fma_pago,
    fch_venc: api.fch_venc,
    status: api.status as InvoiceStatus,
    estado_sii: api.estado_sii,
    order_ids: api.order_ids ?? [],
    created_at: api.created_at,
    error_message: api.error_message,
    last_resend: api.last_resend,
  };
}

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (filters?: { client_id?: string }) => [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: number) => [...invoiceKeys.details(), id] as const,
};

export async function fetchInvoices(params?: { client_id?: string }): Promise<Invoice[]> {
  const qs = new URLSearchParams();
  if (params?.client_id) qs.set('client_id', params.client_id);
  const query = qs.toString();
  const res = await apiFetch<{ data: ApiInvoice[] }>(`/invoices${query ? `?${query}` : ''}`);
  return res.data.map(mapApiInvoice);
}

export async function fetchInvoiceById(id: number): Promise<Invoice> {
  const res = await apiFetch<{ data: ApiInvoice }>(`/invoices/${id}`);
  return mapApiInvoice(res.data);
}

export async function apiPreviewInvoice(orderIds: number[], fmaPago?: number, fchVenc?: string): Promise<string> {
  const body: Record<string, unknown> = { order_ids: orderIds };
  if (fmaPago !== undefined) body.fma_pago = fmaPago;
  if (fchVenc) body.fch_venc = fchVenc;
  const res = await apiFetch<{ data: string; type: string }>('/invoices/preview', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return blobUrlFromBase64(res.data, res.type || 'image/png');
}

/** Async emission — returns 202 with execution ARN */
export async function apiCreateInvoice(
  orderIds: number[],
  fmaPago: number,
  fchVenc: string,
): Promise<{ execution_arn: string; order_ids: number[] }> {
  const res = await apiFetch<{ data: { execution_arn: string; order_ids: number[] } }>('/invoices', {
    method: 'POST',
    body: JSON.stringify({ order_ids: orderIds, fma_pago: fmaPago, fch_venc: fchVenc }),
  });
  return res.data;
}

/** Resend failed invoice — returns 202, has 1-min cooldown */
export async function apiResendInvoice(id: number): Promise<{ execution_arn: string; order_ids: number[] }> {
  const res = await apiFetch<{ data: { execution_arn: string; order_ids: number[] } }>(`/invoices/${id}/resend`, {
    method: 'POST',
  });
  return res.data;
}

export async function apiGetInvoicePdf(id: number): Promise<string> {
  const res = await apiFetch<{ data: string; type: string }>(`/invoices/${id}/pdf`);
  return blobUrlFromBase64(res.data, res.type || 'application/pdf');
}
