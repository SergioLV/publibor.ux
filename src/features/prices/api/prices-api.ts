import { apiFetch } from '../../../shared/api';
import type { ServiceType } from '../../../shared/types';
import type { PriceTier } from '../model/types';

interface ApiPriceTier {
  id: number;
  service: string;
  min_meters: number;
  max_meters: number | null;
  price: number;
}

// --- Query key factory ---

export const priceKeys = {
  all: ['prices'] as const,
  defaults: () => [...priceKeys.all, 'defaults'] as const,
};

// --- API functions ---

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

export async function updateDefaultPriceTier(tier: {
  service: string;
  min_meters: number;
  max_meters: number | null;
  price: number;
}): Promise<PriceTier> {
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
