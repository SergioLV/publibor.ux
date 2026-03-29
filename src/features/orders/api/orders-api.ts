import { apiFetch, blobUrlFromBase64 } from '../../../shared/api';
import type { ServiceType, PaginatedResponse } from '../../../shared/types';
import type { Order, PurchaseOrder, PhotoPayload, OrderPhoto } from '../model/types';

interface ApiOrder {
  id: number;
  client_id: number;
  service: string;
  description: string | null;
  meters: number;
  unit_price: number;
  subtotal: number;
  tax_pct: number;
  tax_amount: number;
  total_amount: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  invoice_id: number | null;
  purchase_orders?: { id?: number; oc_number: string; date?: string | null }[];
  bultos?: number;
  photos?: { id: number; filename: string; content_type: string; url: string }[];
}

function mapApiOrder(api: ApiOrder): Order {
  return {
    id: String(api.id),
    client_id: String(api.client_id),
    service: api.service as ServiceType,
    description: api.description ?? undefined,
    meters: api.meters,
    unit_price: api.unit_price,
    subtotal: api.subtotal,
    tax_pct: api.tax_pct,
    tax_amount: api.tax_amount,
    total_amount: api.total_amount,
    is_paid: api.is_paid,
    paid_at: api.paid_at,
    created_at: api.created_at,
    invoice_id: api.invoice_id,
    purchase_orders: api.purchase_orders?.map((po) => ({ oc_number: po.oc_number, date: po.date ?? undefined })),
    bultos: api.bultos ?? undefined,
    photos: api.photos ?? undefined,
  };
}

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: FetchOrdersParams) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  purchaseOrders: (clientId: string) => [...orderKeys.all, 'po', clientId] as const,
};

export interface FetchOrdersParams {
  client_id?: string; service?: string; is_paid?: boolean;
  date_from?: string; date_to?: string; page?: number; limit?: number;
}
export interface FetchOrdersResult {
  orders: Order[]; total: number; page: number; totalPages: number;
}

export async function fetchOrders(params: FetchOrdersParams = {}): Promise<FetchOrdersResult> {
  const qs = new URLSearchParams();
  if (params.client_id) qs.set('client_id', params.client_id);
  if (params.service) qs.set('service', params.service);
  if (params.is_paid !== undefined) qs.set('is_paid', String(params.is_paid));
  if (params.date_from) qs.set('date_from', params.date_from);
  if (params.date_to) qs.set('date_to', params.date_to);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const res = await apiFetch<PaginatedResponse<ApiOrder>>(`/orders${query ? `?${query}` : ''}`);
  return { orders: res.data.map(mapApiOrder), total: res.total, page: res.page, totalPages: res.total_pages };
}

export async function fetchOrderById(id: string): Promise<Order> {
  const res = await apiFetch<{ data: ApiOrder }>(`/orders/${id}`);
  return mapApiOrder(res.data);
}

export async function apiCreateOrder(data: {
  client_id: number; service: string; description?: string; meters: number;
  unit_price?: number; bultos?: number; purchase_orders?: PurchaseOrder[]; photos?: PhotoPayload[];
}): Promise<Order> {
  const body: Record<string, unknown> = { client_id: data.client_id, service: data.service, meters: data.meters };
  if (data.description) body.description = data.description;
  if (data.unit_price !== undefined) body.unit_price = data.unit_price;
  if (data.bultos !== undefined && data.bultos > 0) body.bultos = data.bultos;
  if (data.purchase_orders && data.purchase_orders.length > 0) body.purchase_orders = data.purchase_orders;
  if (data.photos && data.photos.length > 0) body.photos = data.photos;
  const res = await apiFetch<{ data: ApiOrder }>('/orders', { method: 'POST', body: JSON.stringify(body) });
  return mapApiOrder(res.data);
}

export async function apiUpdateOrder(id: string, data: {
  service?: string; description?: string; meters?: number; unit_price?: number;
  is_paid?: boolean; purchase_orders?: PurchaseOrder[]; bultos?: number; photos?: PhotoPayload[];
}): Promise<Order> {
  const body: Record<string, unknown> = {};
  if (data.service !== undefined) body.service = data.service;
  if (data.description !== undefined) body.description = data.description || null;
  if (data.meters !== undefined) body.meters = data.meters;
  if (data.unit_price !== undefined) body.unit_price = data.unit_price;
  if (data.is_paid !== undefined) body.is_paid = data.is_paid;
  if (data.purchase_orders !== undefined) body.purchase_orders = data.purchase_orders.length > 0
    ? data.purchase_orders.map((po) => ({ oc_number: po.oc_number, ...(po.date ? { date: po.date } : {}) })) : [];
  if (data.bultos !== undefined) body.bultos = data.bultos;
  if (data.photos !== undefined && data.photos.length > 0) body.photos = data.photos;
  const res = await apiFetch<{ data: ApiOrder }>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  return mapApiOrder(res.data);
}

export async function apiDeleteOrder(id: string): Promise<void> {
  await apiFetch<{ data: { message: string } }>(`/orders/${id}`, { method: 'DELETE' });
}

export async function apiBulkMarkPaid(ids: string[]): Promise<number> {
  const res = await apiFetch<{ data: ApiOrder[] }>('/orders/mark-paid', {
    method: 'PUT', body: JSON.stringify({ ids: ids.map(Number) }),
  });
  return res.data.length;
}

// --- Cotización / Export (all use apiFetch now) ---

export async function openBulkCotizacion(orderIds: string[]): Promise<void> {
  const res = await apiFetch<{ data: string; type: string }>('/orders/cotizacion', {
    method: 'POST', body: JSON.stringify({ order_ids: orderIds.map(Number) }),
  });
  window.open(blobUrlFromBase64(res.data, res.type || 'application/pdf'));
}

export async function getCotizacionPdf(orderId: string): Promise<void> {
  const res = await apiFetch<{ data: string; type: string }>(`/orders/${orderId}/cotizacion`);
  window.open(blobUrlFromBase64(res.data, res.type || 'application/pdf'));
}

export async function downloadExcelExport(orderIds: string[]): Promise<void> {
  const res = await apiFetch<{ data: string; filename: string; type: string }>(`/orders/export?ids=${orderIds.join(',')}`);
  const blobUrl = blobUrlFromBase64(res.data, res.type);
  const a = document.createElement('a'); a.href = blobUrl; a.download = res.filename; a.click(); URL.revokeObjectURL(blobUrl);
}

export async function downloadCotizacion(data: {
  client_id: number; service: string; description?: string; meters: number;
  unit_price?: number; purchase_orders?: PurchaseOrder[];
}): Promise<void> {
  const payload: Record<string, unknown> = { client_id: data.client_id, service: data.service, meters: data.meters };
  if (data.description) payload.description = data.description;
  if (data.unit_price !== undefined) payload.unit_price = data.unit_price;
  if (data.purchase_orders && data.purchase_orders.length > 0) payload.purchase_orders = data.purchase_orders;
  const res = await apiFetch<{ data: string; type: string }>('/cotizacion', {
    method: 'POST', body: JSON.stringify({ order_ids: [data.client_id] }),
  });
  window.open(blobUrlFromBase64(res.data, 'application/pdf'));
}

// --- New: Photo CRUD ---

export async function uploadOrderPhotos(orderId: string, photos: PhotoPayload[]): Promise<OrderPhoto[]> {
  const res = await apiFetch<{ data: OrderPhoto[] }>(`/orders/${orderId}/photos`, {
    method: 'POST', body: JSON.stringify({ photos }),
  });
  return res.data;
}

export async function deleteOrderPhoto(orderId: string, photoId: number): Promise<void> {
  await apiFetch<{ data: { message: string } }>(`/orders/${orderId}/photos/${photoId}`, { method: 'DELETE' });
}

// --- New: Purchase Order CRUD ---

export async function fetchPurchaseOrders(clientId: string): Promise<PurchaseOrder[]> {
  const res = await apiFetch<{ data: { id: number; oc_number: string; date: string | null }[] }>(`/orders/purchase-orders?client_id=${clientId}`);
  return res.data.map((po) => ({ oc_number: po.oc_number, date: po.date ?? undefined }));
}

export async function createPurchaseOrder(clientId: number, ocNumber: string, date?: string): Promise<PurchaseOrder> {
  const res = await apiFetch<{ data: { id: number; oc_number: string; date: string | null } }>('/orders/purchase-orders', {
    method: 'POST', body: JSON.stringify({ client_id: clientId, oc_number: ocNumber, ...(date ? { date } : {}) }),
  });
  return { oc_number: res.data.oc_number, date: res.data.date ?? undefined };
}
