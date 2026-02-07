import { Client, Order, DefaultPrices, ServiceType, TAX_PCT } from './types';

let clientIdCounter = 1;
let orderIdCounter = 1;

export const defaultPrices: DefaultPrices = {
  TEXTIL: 5000,
  UV: 8000,
  TEXTURIZADO: 12000,
};

let clients: Client[] = [
  {
    id: String(clientIdCounter++),
    name: 'Cliente Demo',
    rut: '12.345.678-9',
    email: 'demo@test.cl',
    phone: '+56912345678',
    is_active: true,
    preferentialPrices: { TEXTIL: 4500 },
  },
];

let orders: Order[] = [];

export function getClients(): Client[] {
  return [...clients];
}

export function getActiveClients(): Client[] {
  return clients.filter((c) => c.is_active);
}

export function getClientById(id: string): Client | undefined {
  return clients.find((c) => c.id === id);
}

export function createClient(data: Omit<Client, 'id'>): Client {
  const client: Client = { ...data, id: String(clientIdCounter++) };
  clients.push(client);
  return client;
}

export function updateClient(id: string, data: Omit<Client, 'id'>): Client | null {
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  clients[idx] = { ...data, id };
  return clients[idx];
}

export function getEffectivePrice(client: Client, service: ServiceType): number | null {
  const pref = client.preferentialPrices[service];
  if (pref !== undefined && pref > 0) return pref;
  return defaultPrices[service];
}

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
