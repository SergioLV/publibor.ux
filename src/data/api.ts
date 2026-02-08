import type { Client, ClientPrice, PriceTier, ServiceType } from './types';

const API_BASE = 'https://s8agiab37c.execute-api.us-east-1.amazonaws.com/prod/api';

// --- Generic fetch helper ---

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
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
  is_active?: boolean;
  prices?: ApiClientPriceInput[];
}): Promise<Client> {
  const body = {
    name: data.name,
    rut: data.rut || null,
    email: data.email || null,
    phone: data.phone || null,
    billing_addr: data.billing_addr || null,
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
  is_active?: boolean;
  prices?: ApiClientPriceInput[];
}): Promise<Client> {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.rut !== undefined) body.rut = data.rut || null;
  if (data.email !== undefined) body.email = data.email || null;
  if (data.phone !== undefined) body.phone = data.phone || null;
  if (data.billing_addr !== undefined) body.billing_addr = data.billing_addr || null;
  if (data.is_active !== undefined) body.is_active = data.is_active;
  if (data.prices !== undefined) body.prices = data.prices.length > 0 ? data.prices : null;

  const res = await apiFetch<{ data: ApiClient }>(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return mapApiClient(res.data);
}
