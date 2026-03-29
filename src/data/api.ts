/**
 * COMPATIBILITY LAYER — re-exports from new FSD modules.
 * This file will be deleted once all components are fully migrated.
 */

// Auth
export { getAuthToken, setAuthToken, clearAuthToken, apiLogin, apiGetMe } from '../features/auth';
export type { AuthUser } from '../features/auth';

// Clients
export { fetchClients, fetchClientById, apiCreateClient, apiUpdateClient } from '../features/clients';
export type { FetchClientsParams, FetchClientsResult } from '../features/clients';

// Orders
export {
  fetchOrders,
  fetchOrderById,
  apiCreateOrder,
  apiUpdateOrder,
  apiDeleteOrder,
  apiBulkMarkPaid,
  openBulkCotizacion,
  getCotizacionPdf,
  downloadExcelExport,
  downloadCotizacion,
  uploadOrderPhotos,
  deleteOrderPhoto,
  fetchPurchaseOrders,
  createPurchaseOrder,
} from '../features/orders';
export type { FetchOrdersParams, FetchOrdersResult, PhotoPayload } from '../features/orders';

// Invoices
export {
  fetchInvoices,
  fetchInvoiceById,
  apiPreviewInvoice,
  apiCreateInvoice,
  apiResendInvoice,
  apiGetInvoicePdf,
} from '../features/invoices';

// Prices
export { fetchDefaultPrices, updateDefaultPriceTier } from '../features/prices';
