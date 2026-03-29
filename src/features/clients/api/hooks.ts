import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientKeys, fetchClients, fetchClientById, apiCreateClient, apiUpdateClient } from './clients-api';
import type { FetchClientsParams } from './clients-api';

export function useClients(params: FetchClientsParams = {}) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: () => fetchClients(params),
  });
}

export function useClient(id: string | null) {
  return useQuery({
    queryKey: clientKeys.detail(id!),
    queryFn: () => fetchClientById(id!),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiCreateClient,
    onSuccess: () => { qc.invalidateQueries({ queryKey: clientKeys.lists() }); },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiUpdateClient>[1] }) =>
      apiUpdateClient(id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: clientKeys.lists() });
      qc.invalidateQueries({ queryKey: clientKeys.detail(vars.id) });
    },
  });
}
