import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  invoiceKeys, fetchInvoices, fetchInvoiceById,
  apiCreateInvoice, apiResendInvoice, apiGetInvoicePdf, apiPreviewInvoice,
} from './invoices-api';

export function useInvoices(params?: { client_id?: string }) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => fetchInvoices(params),
  });
}

export function useInvoice(id: number | null) {
  return useQuery({
    queryKey: invoiceKeys.detail(id!),
    queryFn: () => fetchInvoiceById(id!),
    enabled: id !== null,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderIds, fmaPago, fchVenc }: { orderIds: number[]; fmaPago: number; fchVenc: string }) =>
      apiCreateInvoice(orderIds, fmaPago, fchVenc),
    onSuccess: () => { qc.invalidateQueries({ queryKey: invoiceKeys.lists() }); },
  });
}

export function useResendInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiResendInvoice,
    onSuccess: () => { qc.invalidateQueries({ queryKey: invoiceKeys.lists() }); },
  });
}

export function useInvoicePdf() {
  return useMutation({ mutationFn: apiGetInvoicePdf });
}

export function usePreviewInvoice() {
  return useMutation({
    mutationFn: ({ orderIds, fmaPago, fchVenc }: { orderIds: number[]; fmaPago?: number; fchVenc?: string }) =>
      apiPreviewInvoice(orderIds, fmaPago, fchVenc),
  });
}
