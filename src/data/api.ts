import type { Client, ServiceType } from './types';

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

// --- Client types from API ---

interface ApiPrice {
  service: ServiceType;
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
  prices: ApiPrice[] | null;
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
  const preferentialPrices: Partial<Record<ServiceType, number>> = {};
  if (api.prices) {
    for (const p of api.prices) {
      preferentialPrices[p.service] = p.price;
    }
  }
  return {
    id: String(api.id),
    name: api.name,
    rut: api.rut ?? undefined,
    email: api.email ?? undefined,
    phone: api.phone ?? undefined,
    billing_addr: api.billing_addr ?? undefined,
    is_active: api.is_active,
    preferentialPrices,
    created_at: api.created_at,
    updated_at: api.updated_at,
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

function pricesToApi(prefs: Partial<Record<ServiceType, number>>): ApiPrice[] | null {
  const arr: ApiPrice[] = [];
  for (const [service, price] of Object.entries(prefs)) {
    if (price !== undefined && price > 0) {
      arr.push({ service: service as ServiceType, price });
    }
  }
  return arr.length > 0 ? arr : null;
}

export async function apiCreateClient(data: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
  const body = {
    name: data.name,
    rut: data.rut || null,
    email: data.email || null,
    phone: data.phone || null,
    billing_addr: data.billing_addr || null,
    is_active: data.is_active,
    prices: pricesToApi(data.preferentialPrices),
  };
  const res = await apiFetch<{ data: ApiClient }>('/clients', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapApiClient(res.data);
}

export async function apiUpdateClient(id: string, data: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
  const body = {
    name: data.name,
    rut: data.rut || null,
    email: data.email || null,
    phone: data.phone || null,
    billing_addr: data.billing_addr || null,
    is_active: data.is_active,
    prices: pricesToApi(data.preferentialPrices),
  };
  const res = await apiFetch<{ data: ApiClient }>(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return mapApiClient(res.data);
}
