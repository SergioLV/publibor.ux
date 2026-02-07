import type { Client, Order, DefaultPrices, ServiceType } from './types';
import { TAX_PCT } from './types';

let orderIdCounter = 1;

export const defaultPrices: DefaultPrices = {
  TEXTIL: 5000,
  UV: 8000,
  TEXTURIZADO: 12000,
};

let orders: Order[] = [];

// --- Client helpers (no longer store data, just compute) ---

export function getEffectivePrice(client: Client, service: ServiceType): number | null {
  const pref = client.preferentialPrices[service];
  if (pref !== undefined && pref > 0) return pref;
  return defaultPrices[service];
}

// --- Order functions (still in-memory for now) ---

export function calculateOrder(unitPrice: number, meters: number) {
  const subtotal = Math.round(meters * unitPrice);
  const tax_amount = Math.round(subtotal * (TAX_PCT / 100));
  const total_amount = subtotal + tax_amount;
  return { subtotal, tax_pct: TAX_PCT, tax_amount, total_amount };
}

export function createOrder(client_id: string, service: ServiceType, meters: number, unit_price: number): Order {
  const calc = calculateOrder(unit_price, meters);
  const order: Order = {
    id: String(orderIdCounter++),
    client_id,
    service,
    meters,
    unit_price,
    ...calc,
    is_paid: false,
    paid_at: null,
    created_at: new Date().toISOString(),
  };
  orders.push(order);
  return order;
}

export function getOrders(): Order[] {
  return [...orders];
}

export function togglePaid(orderId: string): Order | null {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;
  order.is_paid = !order.is_paid;
  order.paid_at = order.is_paid ? new Date().toISOString() : null;
  return { ...order };
}

export function getDefaultPrices(): DefaultPrices {
  return { ...defaultPrices };
}

export function updateDefaultPrice(service: ServiceType, price: number | null) {
  defaultPrices[service] = price;
}
