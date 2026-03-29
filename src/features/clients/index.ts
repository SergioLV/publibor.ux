export type { Client, ClientPrice } from './model/types';
export {
  clientKeys,
  fetchClients,
  fetchClientById,
  apiCreateClient,
  apiUpdateClient,
} from './api/clients-api';
export type { FetchClientsParams, FetchClientsResult } from './api/clients-api';
export { useClients, useClient, useCreateClient, useUpdateClient } from './api/hooks';
