import type { Client, Order, PriceTier, ServiceType } from './types';
import { TAX_PCT } from './types';

let orderIdCounter = 1;
let orders: Order[] = [];

// --- Tier lookup ---

export function findTier(tiers: PriceTier[], service: ServiceType, quantity: number): PriceTier | null {
  const serviceTiers = tiers
    .filter((t) => t.service === service)
    .sort((a, b) => a.min_meters - b.min_meters);

  for (const tier of serviceTiers) {
    const min = tier.min_meters;
    const max = tier.max_meters;
    if (quantity >= min && (max === null || quantity <= max)) {
      return tier;
    }
  }
  return null;
}

// --- Effective price: check client override for the matched tier ---

export function getEffectivePrice(
  client: Client,
  tiers: PriceTier[],
  service: ServiceType,
  quantity: number
): { price: number; tier: PriceTier; isOverride: boolean } | null {
  const tier = findTier(tiers, service, quantity);
  if (!tier) return null;

  const override = client.prices.find((p) => p.default_price_id === tier.id);
  if (override) {
    return { price: override.price, tier, isOverride: true };
  }
  return { price: tier.price, tier, isOverride: false };
}

// --- Order calculation ---

export function calculateOrder(unitPrice: number, quantity: number) {
  const subtotal = Math.round(quantity * unitPrice);
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
