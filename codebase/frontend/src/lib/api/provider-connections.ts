import { apiClient } from '../api-client';
import {
  CreateProviderConnectionInput,
  ProviderConnection,
  TestConnectionResult,
  UpdateProviderConnectionInput,
} from '../../types/provider-connections';

export async function fetchProviderConnections(
  enabledOnly: boolean = false,
): Promise<ProviderConnection[]> {
  const response = await apiClient.get<ProviderConnection[]>(
    '/provider-connections',
    {
      params: enabledOnly ? { enabledOnly: 'true' } : {},
    },
  );
  return response.data;
}

export async function createProviderConnection(
  data: CreateProviderConnectionInput,
): Promise<ProviderConnection> {
  const response = await apiClient.post<ProviderConnection>(
    '/provider-connections',
    data,
  );
  return response.data;
}

export async function updateProviderConnection(
  id: string,
  data: UpdateProviderConnectionInput,
): Promise<ProviderConnection> {
  const response = await apiClient.patch<ProviderConnection>(
    `/provider-connections/${id}`,
    data,
  );
  return response.data;
}

export async function deleteProviderConnection(id: string): Promise<void> {
  await apiClient.delete(`/provider-connections/${id}`);
}

export async function testProviderConnection(
  id: string,
): Promise<TestConnectionResult> {
  const response = await apiClient.post<TestConnectionResult>(
    `/provider-connections/${id}/test`,
  );
  return response.data;
}
