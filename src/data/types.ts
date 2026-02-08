export type ServiceType = 'DTF' | 'SUBLIMACION' | 'UV' | 'TEXTURIZADO';

export const SERVICE_TYPES: ServiceType[] = ['DTF', 'SUBLIMACION', 'UV', 'TEXTURIZADO'];

export const TAX_PCT = 19;

// A default price tier (from the API)
export interface PriceTier {
  id: number;
  service: ServiceType;
  min_meters: number;
  max_meters: number | null; // null = unlimited
  price: number;
}

// A client's preferential price override on a specific tier
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
  is_active: boolean;
  prices: ClientPrice[];
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  client_id: string;
  service: ServiceType;
  meters: number;
  unit_price: number;
  subtotal: number;
  tax_pct: number;
  tax_amount: number;
  total_amount: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
}

// Helper: is this service priced per cloth (not per meter)?
export function isPerCloth(service: ServiceType): boolean {
  return service === 'TEXTURIZADO';
}

// Helper: unit label
export function unitLabel(service: ServiceType): string {
  return isPerCloth(service) ? 'paño' : 'm';
}
