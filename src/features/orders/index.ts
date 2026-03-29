export type { Order, PurchaseOrder, OrderPhoto, PhotoPayload } from './model/types';
export {
  orderKeys,
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
} from './api/orders-api';
export type { FetchOrdersParams, FetchOrdersResult } from './api/orders-api';
export { useOrders, useCreateOrder, useUpdateOrder, useDeleteOrder, useBulkMarkPaid } from './api/hooks';
