import { apiClient } from '../api-client';

export interface UsageSummary {
  jobsToday: number;
  jobsThisMonth: number;
  dailyLimit: number;
  monthlyLimit: number;
  totalCostUsd: number;
  blockPaidProviders: boolean;
  providerBreakdown: Array<{
    providerId: string;
    totalUnits: number;
    totalCost: number;
    callCount: number;
  }>;
}

export interface UserLimits {
  dailyJobCap: number;
  monthlyJobCap: number;
  maxCostPerProjectUsd: number;
  blockPaidProviders: boolean;
  allowedProviders: string[];
}

export interface ProviderUsageLog {
  _id: string;
  providerId: string;
  modelId: string;
  operation: string;
  status: 'success' | 'failed';
  unitsConsumed: number;
  durationSeconds: number;
  costEstimatedUsd: number;
  isPaid: boolean;
  errorMessage?: string;
  createdAt: string;
}

export async function fetchUsageSummary(): Promise<UsageSummary> {
  const res = await apiClient.get<UsageSummary>('/usage/summary');
  return res.data;
}

export async function fetchUserLimits(): Promise<UserLimits> {
  const res = await apiClient.get<UserLimits>('/usage/limits');
  return res.data;
}

export async function updateUserLimits(dto: Partial<UserLimits>): Promise<UserLimits> {
  const res = await apiClient.patch<UserLimits>('/usage/limits', dto);
  return res.data;
}

export async function fetchUsageLogs(limit: number = 50, skip: number = 0): Promise<ProviderUsageLog[]> {
  const res = await apiClient.get<ProviderUsageLog[]>('/usage/logs', {
    params: { limit, skip },
  });
  return res.data;
}

