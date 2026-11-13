import { apiClient } from '../api-client';
import { Provider, ProviderModel } from '../../types/providers';

export async function fetchProviders(all: boolean = false): Promise<Provider[]> {
  const response = await apiClient.get<Provider[]>('/providers', {
    params: all ? { all: 'true' } : {},
  });
  return response.data;
}

export async function fetchProvider(providerId: string): Promise<Provider> {
  const response = await apiClient.get<Provider>(`/providers/${providerId}`);
  return response.data;
}

export async function fetchProviderModels(
  providerId: string,
  all: boolean = false,
): Promise<ProviderModel[]> {
  const response = await apiClient.get<ProviderModel[]>(
    `/providers/${providerId}/models`,
    {
      params: all ? { all: 'true' } : {},
    },
  );
  return response.data;
}
