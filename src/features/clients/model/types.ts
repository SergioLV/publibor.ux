import type { ServiceType } from '../../../shared/types';

export interface ClientPrice {
  id?: number;
  default_price_id: number;
  service: ServiceType;
  min_meters: number;
  max_meters: number | null;
  price: number;
}

export interface Client {
  id: string;
  name: string;
  rut?: string;
  email?: string;
  phone?: string;
  billing_addr?: string;
  giro?: string;
  comuna?: string;
  ciudad?: string;
  is_active: boolean;
  prices: ClientPrice[];
  created_at?: string;
  updated_at?: string;
}
