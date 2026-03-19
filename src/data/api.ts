import type { Client, ClientPrice, Invoice, Order, PriceTier, PurchaseOrder, ServiceType } from './types';

const API_BASE = 'https://s8agiab37c.execute-api.us-east-1.amazonaws.com/prod/api';

// --- Generic fetch helper ---

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('publibor-token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) {
      localStorage.removeItem('publibor-token');
      localStorage.removeItem('publibor-token-expires');
      window.location.reload();
    }
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

// --- API response types ---

interface ApiPriceTier {
  id: number;
  service: string;
  min_meters: number;
  max_meters: number | null;
  price: number;
}

interface ApiClientPrice {
  id: number;
  default_price_id: number;
  service: string;
  min_meters: number;
  max_meters: number | null;
  price: number;
}

interface ApiClient {
  id: number;
  name: string;
  rut: string | null;
  email: string | null;
  phone: string | null;
  billing_addr: string | null;
  giro: string | null;
  comuna: string | null;
  ciudad: string | null;
  is_active: boolean;
  prices: ApiClientPrice[] | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// --- Mappers ---

function mapApiClient(api: ApiClient): Client {
  const prices: ClientPrice[] = (api.prices ?? []).map((p) => ({
    id: p.id,
    default_price_id: p.default_price_id,
    service: p.service as ServiceType,
    min_meters: p.min_meters,
    max_meters: p.max_meters,
    price: p.price,
  }));
  return {
    id: String(api.id),
    name: api.name,
    rut: api.rut ?? undefined,
    email: api.email ?? undefined,
    phone: api.phone ?? undefined,
    billing_addr: api.billing_addr ?? undefined,
    giro: api.giro ?? undefined,
    comuna: api.comuna ?? undefined,
    ciudad: api.ciudad ?? undefined,
    is_active: api.is_active,
    prices,
    created_at: api.created_at,
    updated_at: api.updated_at,
  };
}

// --- Default Prices (Tiers) API ---

export async function fetchDefaultPrices(): Promise<PriceTier[]> {
  const res = await apiFetch<{ data: ApiPriceTier[] }>('/default-prices');
  return res.data.map((t) => ({
    id: t.id,
    service: t.service as ServiceType,
    min_meters: t.min_meters,
    max_meters: t.max_meters,
    price: t.price,
  }));
}

export async function updateDefaultPriceTier(tier: { service: string; min_meters: number; max_meters: number | null; price: number }): Promise<PriceTier> {
  const res = await apiFetch<{ data: ApiPriceTier }>('/default-prices', {
    method: 'POST',
    body: JSON.stringify(tier),
  });
  return {
    id: res.data.id,
    service: res.data.service as ServiceType,
    min_meters: res.data.min_meters,
    max_meters: res.data.max_meters,
    price: res.data.price,
  };
}

// --- Client API ---

export interface FetchClientsParams {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
}

export interface FetchClientsResult {
  clients: Client[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchClients(params: FetchClientsParams = {}): Promise<FetchClientsResult> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.active !== undefined) qs.set('active', String(params.active));

  const query = qs.toString();
  const res = await apiFetch<PaginatedResponse<ApiClient>>(`/clients${query ? `?${query}` : ''}`);

  return {
    clients: res.data.map(mapApiClient),
    total: res.total,
    page: res.page,
    totalPages: res.total_pages,
  };
}

export async function fetchClientById(id: string): Promise<Client> {
  const res = await apiFetch<{ data: ApiClient }>(`/clients/${id}`);
  return mapApiClient(res.data);
}

interface ApiClientPriceInput {
  default_price_id: number;
  price: number;
}

export async function apiCreateClient(data: {
  name: string;
  rut?: string;
  email?: string;
  phone?: string;
  billing_addr?: string;
  giro?: string;
  comuna?: string;
  ciudad?: string;
  is_active?: boolean;
  prices?: ApiClientPriceInput[];
}): Promise<Client> {
  const body = {
    name: data.name,
    rut: data.rut || null,
    email: data.email || null,
    phone: data.phone || null,
    billing_addr: data.billing_addr || null,
    giro: data.giro || null,
    comuna: data.comuna || null,
    ciudad: data.ciudad || null,
    prices: data.prices && data.prices.length > 0 ? data.prices : null,
  };
  const res = await apiFetch<{ data: ApiClient }>('/clients', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapApiClient(res.data);
}

export async function apiUpdateClient(id: string, data: {
  name?: string;
  rut?: string;
  email?: string;
  phone?: string;
  billing_addr?: string;
  giro?: string;
  comuna?: string;
  ciudad?: string;
  is_active?: boolean;
  prices?: ApiClientPriceInput[];
}): Promise<Client> {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.rut !== undefined) body.rut = data.rut || null;
  if (data.email !== undefined) body.email = data.email || null;
  if (data.phone !== undefined) body.phone = data.phone || null;
  if (data.billing_addr !== undefined) body.billing_addr = data.billing_addr || null;
  if (data.giro !== undefined) body.giro = data.giro || null;
  if (data.comuna !== undefined) body.comuna = data.comuna || null;
  if (data.ciudad !== undefined) body.ciudad = data.ciudad || null;
  if (data.is_active !== undefined) body.is_active = data.is_active;
  if (data.prices !== undefined) body.prices = data.prices.length > 0 ? data.prices : null;

  const res = await apiFetch<{ data: ApiClient }>(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return mapApiClient(res.data);
}

// --- Orders API ---

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
    purchase_orders: api.purchase_orders?.map(po => ({
      oc_number: po.oc_number,
      date: po.date ?? undefined,
    })),
    bultos: api.bultos ?? undefined,
    photos: api.photos ?? undefined,
  };
}

export interface FetchOrdersParams {
  client_id?: string;
  service?: string;
  is_paid?: boolean;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface FetchOrdersResult {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
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

  return {
    orders: res.data.map(mapApiOrder),
    total: res.total,
    page: res.page,
    totalPages: res.total_pages,
  };
}

export interface PhotoPayload {
  filename: string;
  content_type: string;
  data: string;
}

export async function apiCreateOrder(data: {
  client_id: number;
  service: string;
  description?: string;
  meters: number;
  unit_price?: number;
  bultos?: number;
  purchase_orders?: PurchaseOrder[];
  photos?: PhotoPayload[];
}): Promise<Order> {
  const body: Record<string, unknown> = {
    client_id: data.client_id,
    service: data.service,
    meters: data.meters,
  };
  if (data.description) body.description = data.description;
  if (data.unit_price !== undefined) body.unit_price = data.unit_price;
  if (data.bultos !== undefined && data.bultos > 0) body.bultos = data.bultos;
  if (data.purchase_orders && data.purchase_orders.length > 0) body.purchase_orders = data.purchase_orders;
  if (data.photos && data.photos.length > 0) body.photos = data.photos;

  const res = await apiFetch<{ data: ApiOrder }>('/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapApiOrder(res.data);
}

export async function apiUpdateOrder(id: string, data: {
  service?: string;
  description?: string;
  meters?: number;
  unit_price?: number;
  is_paid?: boolean;
  purchase_orders?: PurchaseOrder[];
  bultos?: number;
  photos?: PhotoPayload[];
}): Promise<Order> {
  const body: Record<string, unknown> = {};
  if (data.service !== undefined) body.service = data.service;
  if (data.description !== undefined) body.description = data.description || null;
  if (data.meters !== undefined) body.meters = data.meters;
  if (data.unit_price !== undefined) body.unit_price = data.unit_price;
  if (data.is_paid !== undefined) body.is_paid = data.is_paid;
  if (data.purchase_orders !== undefined) body.purchase_orders = data.purchase_orders.length > 0
    ? data.purchase_orders.map(po => ({ oc_number: po.oc_number, ...(po.date ? { date: po.date } : {}) }))
    : [];
  if (data.bultos !== undefined) body.bultos = data.bultos;
  if (data.photos !== undefined && data.photos.length > 0) body.photos = data.photos;

  const res = await apiFetch<{ data: ApiOrder }>(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return mapApiOrder(res.data);
}

// --- Bulk mark paid ---

export async function apiBulkMarkPaid(ids: string[]): Promise<number> {
  const res = await apiFetch<{ updated: number }>('/orders/mark-paid', {
    method: 'PUT',
    body: JSON.stringify({ ids: ids.map(Number) }),
  });
  return res.updated;
}

// --- Bulk Cotización PDF ---

export async function openBulkCotizacion(orderIds: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/orders/cotizacion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_ids: orderIds.map(Number) }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  const json = await res.json();
  const bytes = atob(json.data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: json.type || 'application/pdf' });
  window.open(URL.createObjectURL(blob));
}


export function getBulkCotizacionUrl(orderIds: string[]): string {
  return `${API_BASE}/orders/cotizacion?order_ids=${orderIds.join(',')}`;
}

// --- Cotización PDF ---

export function getCotizacionUrl(orderId: string): string {
  return `${API_BASE}/orders/${orderId}/cotizacion`;
}

export function getExcelExportUrl(orderIds: string[]): string {
  return `${API_BASE}/orders/export?ids=${orderIds.join(',')}`;
}

export async function downloadExcelExport(orderIds: string[]): Promise<void> {
  const url = `${API_BASE}/orders/export?ids=${orderIds.join(',')}`;
  const res = await apiFetch<{ data: string; filename: string; type: string }>(url.replace(API_BASE, ''));
  const byteChars = atob(res.data);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: res.type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = res.filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// --- Cotización PDF (pre-order quote) ---

export async function downloadCotizacion(data: {
  client_id: number;
  service: string;
  description?: string;
  meters: number;
  unit_price?: number;
  purchase_orders?: PurchaseOrder[];
}): Promise<void> {
  const payload: Record<string, unknown> = {
    client_id: data.client_id,
    service: data.service,
    meters: data.meters,
  };
  if (data.description) payload.description = data.description;
  if (data.unit_price !== undefined) payload.unit_price = data.unit_price;
  if (data.purchase_orders && data.purchase_orders.length > 0) payload.purchase_orders = data.purchase_orders;

  const res = await fetch(`${API_BASE}/cotizacion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: payload }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  const json = await res.json();
  const bytes = atob(json.data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: 'application/pdf' });
  window.open(URL.createObjectURL(blob));
}


// --- Invoice API ---

interface ApiInvoice {
  id: number;
  client_id: number;
  folio: number | null;
  tipo_dte: number;
  fecha_emision: string | null;
  monto_neto: number;
  iva: number;
  monto_total: number;
  status: string;
  order_ids: number[];
  created_at: string;
  error_message?: string;
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
    status: api.status as Invoice['status'],
    order_ids: api.order_ids ?? [],
    created_at: api.created_at,
    error_message: api.error_message,
  };
}

export async function apiPreviewInvoice(orderIds: number[]): Promise<string> {
  const res = await apiFetch<{ data: string; type: string }>('/invoices/preview', {
    method: 'POST',
    body: JSON.stringify({ order_ids: orderIds }),
  });
  const byteChars = atob(res.data);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: res.type || 'application/pdf' });
  return URL.createObjectURL(blob);
}

export async function apiCreateInvoice(orderIds: number[], fmaPago: number, fchVenc: string): Promise<Invoice> {
  const res = await apiFetch<{ data: ApiInvoice }>('/invoices', {
    method: 'POST',
    body: JSON.stringify({ order_ids: orderIds, fma_pago: fmaPago, fch_venc: fchVenc }),
  });
  return mapApiInvoice(res.data);
}

export async function fetchInvoiceById(id: number): Promise<Invoice> {
  const res = await apiFetch<{ data: ApiInvoice }>(`/invoices/${id}`);
  return mapApiInvoice(res.data);
}

export async function fetchInvoices(params?: { client_id?: string }): Promise<Invoice[]> {
  const qs = new URLSearchParams();
  if (params?.client_id) qs.set('client_id', params.client_id);
  const query = qs.toString();
  const res = await apiFetch<{ data: ApiInvoice[] }>(`/invoices${query ? `?${query}` : ''}`);
  return res.data.map(mapApiInvoice);
}

export async function apiResendInvoice(id: number): Promise<{ message: string; order_ids: number[] }> {
  return apiFetch<{ message: string; order_ids: number[] }>(`/invoices/${id}/resend`, {
    method: 'POST',
  });
}

export async function apiGetInvoicePdf(id: number): Promise<string> {
  const res = await apiFetch<{ data: string; type: string }>(`/invoices/${id}/pdf`);
  const byteChars = atob(res.data);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: res.type || 'application/pdf' });
  return URL.createObjectURL(blob);
}

// --- Auth API ---

export function getAuthToken(): string | null {
  const token = localStorage.getItem('publibor-token');
  const expires = localStorage.getItem('publibor-token-expires');
  if (!token || !expires) return null;
  if (new Date(expires) <= new Date()) {
    localStorage.removeItem('publibor-token');
    localStorage.removeItem('publibor-token-expires');
    return null;
  }
  return token;
}

export function setAuthToken(token: string, expiresAt: string): void {
  localStorage.setItem('publibor-token', token);
  localStorage.setItem('publibor-token-expires', expiresAt);
}

export function clearAuthToken(): void {
  localStorage.removeItem('publibor-token');
  localStorage.removeItem('publibor-token-expires');
}

export interface AuthUser {
  id: number;
  username: string;
  role: string;
}

export async function apiLogin(username: string, password: string): Promise<{ token: string; expires_at: string }> {
  const res = await apiFetch<{ data: { token: string; expires_at: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  return res.data;
}

export async function apiGetMe(): Promise<AuthUser> {
  const token = getAuthToken();
  const res = await apiFetch<{ data: AuthUser }>('/auth/me', {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return res.data;
}
