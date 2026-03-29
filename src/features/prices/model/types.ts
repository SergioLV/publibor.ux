import type { ServiceType } from '../../../shared/types';

export interface PriceTier {
  id: number;
  service: ServiceType;
  min_meters: number;
  max_meters: number | null;
  price: number;
}
