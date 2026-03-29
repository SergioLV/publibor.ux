/**
 * COMPATIBILITY LAYER — re-exports from new FSD modules.
 * This file will be deleted once all components are migrated.
 */

export type { ServiceType } from '../shared/types';
export { SERVICE_TYPES, TAX_PCT, isPerCloth, unitLabel, serviceLabel } from '../shared/types';

export type { Client, ClientPrice } from '../features/clients';
export type { Order, PurchaseOrder, OrderPhoto } from '../features/orders';
export type { Invoice, InvoiceStatus } from '../features/invoices';
export type { PriceTier } from '../features/prices';
