export type ServiceType = 'DTF' | 'SUBLIMACION' | 'UV' | 'TEXTURIZADO' | 'LASER_CO2' | 'LASER_FIBRA' | 'BORDADOS' | 'TEXTIL' | 'POR_CONFIRMAR';

export const SERVICE_TYPES: ServiceType[] = ['DTF', 'SUBLIMACION', 'UV', 'TEXTURIZADO', 'LASER_CO2', 'LASER_FIBRA', 'BORDADOS', 'TEXTIL', 'POR_CONFIRMAR'];

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
  giro?: string;
  comuna?: string;
  ciudad?: string;
  is_active: boolean;
  prices: ClientPrice[];
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseOrder {
  oc_number: string;
  date?: string;
}

export interface OrderPhoto {
  id: number;
  filename: string;
  content_type: string;
  url: string;
}

export interface Order {
  id: string;
  client_id: string;
  service: ServiceType;
  description?: string;
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
  purchase_orders?: PurchaseOrder[];
  bultos?: number;
  photos?: OrderPhoto[];
}

// Services priced per unit (not per meter)
const PER_UNIT_SERVICES: Set<ServiceType> = new Set(['TEXTURIZADO', 'LASER_CO2', 'LASER_FIBRA', 'BORDADOS', 'TEXTIL', 'POR_CONFIRMAR']);

// Helper: is this service priced per unit (not per meter)?
export function isPerCloth(service: ServiceType): boolean {
  return PER_UNIT_SERVICES.has(service);
}

// Helper: unit label
export function unitLabel(service: ServiceType): string {
  if (service === 'TEXTURIZADO') return 'paño';
  if (PER_UNIT_SERVICES.has(service)) return 'unidad';
  return 'm';
}

// Helper: human-readable service label
export function serviceLabel(service: ServiceType): string {
  const labels: Record<ServiceType, string> = {
    DTF: 'DTF',
    SUBLIMACION: 'Sublimación',
    UV: 'UV',
    TEXTURIZADO: 'Texturizado',
    LASER_CO2: 'Láser CO₂',
    LASER_FIBRA: 'Láser Fibra',
    BORDADOS: 'Bordados',
    TEXTIL: 'Textil',
    POR_CONFIRMAR: 'Por confirmar',
  };
  return labels[service] ?? service;
}

// --- Invoice / DTE types (real API) ---

export type InvoiceStatus = 'pending' | 'emitted' | 'failed' | 'error';

export interface Invoice {
  id: number;
  client_id: number;
  folio: number | null;
  tipo_dte: number;
  fecha_emision: string | null;
  monto_neto: number;
  iva: number;
  monto_total: number;
  status: InvoiceStatus;
  order_ids: number[];
  created_at: string;
  error_message?: string;
}
