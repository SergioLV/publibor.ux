import type { ServiceType } from '../../../shared/types';

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

export interface PhotoPayload {
  filename: string;
  content_type: string;
  data: string;
}
