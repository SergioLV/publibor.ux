import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  orderKeys, fetchOrders, apiCreateOrder, apiUpdateOrder,
  apiDeleteOrder, apiBulkMarkPaid,
} from './orders-api';
import type { FetchOrdersParams } from './orders-api';

export function useOrders(params: FetchOrdersParams = {}) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => fetchOrders(params),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiCreateOrder,
    onSuccess: () => { qc.invalidateQueries({ queryKey: orderKeys.lists() }); },
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiUpdateOrder>[1] }) =>
      apiUpdateOrder(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: orderKeys.lists() }); },
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiDeleteOrder,
    onSuccess: () => { qc.invalidateQueries({ queryKey: orderKeys.lists() }); },
  });
}

export function useBulkMarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiBulkMarkPaid,
    onSuccess: () => { qc.invalidateQueries({ queryKey: orderKeys.lists() }); },
  });
}
