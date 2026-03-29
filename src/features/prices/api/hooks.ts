import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { priceKeys, fetchDefaultPrices, updateDefaultPriceTier } from './prices-api';

export function useDefaultPrices() {
  return useQuery({
    queryKey: priceKeys.defaults(),
    queryFn: fetchDefaultPrices,
  });
}

export function useUpdatePriceTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateDefaultPriceTier,
    onSuccess: () => { qc.invalidateQueries({ queryKey: priceKeys.defaults() }); },
  });
}
