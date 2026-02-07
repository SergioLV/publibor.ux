export type ServiceType = 'TEXTIL' | 'UV' | 'TEXTURIZADO';

export const SERVICE_TYPES: ServiceType[] = ['TEXTIL', 'UV', 'TEXTURIZADO'];

export const TAX_PCT = 19;

export interface Client {
  id: string;
  name: string;
  rut?: string;
  email?: string;
  phone?: string;
  billing_addr?: string;
  is_active: boolean;
  preferentialPrices: Partial<Record<ServiceType, number>>;
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

export interface DefaultPrices {
  TEXTIL: number | null;
  UV: number | null;
  TEXTURIZADO: number | null;
}
