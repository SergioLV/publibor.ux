export type ServiceType =
  | 'DTF'
  | 'SUBLIMACION'
  | 'UV'
  | 'TEXTURIZADO'
  | 'LASER_CO2'
  | 'LASER_FIBRA'
  | 'BORDADOS'
  | 'TEXTIL'
  | 'POR_CONFIRMAR';

export const SERVICE_TYPES: ServiceType[] = [
  'DTF', 'SUBLIMACION', 'UV', 'TEXTURIZADO',
  'LASER_CO2', 'LASER_FIBRA', 'BORDADOS', 'TEXTIL', 'POR_CONFIRMAR',
];

export const TAX_PCT = 19;

const PER_UNIT_SERVICES: Set<ServiceType> = new Set([
  'TEXTURIZADO', 'LASER_CO2', 'LASER_FIBRA', 'BORDADOS', 'TEXTIL', 'POR_CONFIRMAR',
]);

export function isPerCloth(service: ServiceType): boolean {
  return PER_UNIT_SERVICES.has(service);
}

export function unitLabel(service: ServiceType): string {
  if (service === 'TEXTURIZADO') return 'paño';
  if (PER_UNIT_SERVICES.has(service)) return 'unidad';
  return 'm';
}

export function serviceLabel(service: ServiceType): string {
  const labels: Record<ServiceType, string> = {
    DTF: 'DTF',
    SUBLIMACION: 'Sublimación',
    UV: 'UV',
    TEXTURIZADO: 'Texturizado',
    LASER_CO2: 'Láser CO₂',
    LASER_FIBRA: 'Láser Fibra',
    BORDADOS: 'Bordados',
    TEXTIL: 'Textil',
    POR_CONFIRMAR: 'Por confirmar',
  };
  return labels[service] ?? service;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
