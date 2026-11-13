export type ConnectionStatus =
  | 'untested'
  | 'valid'
  | 'invalid'
  | 'quota_exhausted'
  | 'disabled'
  | 'error';

export interface ProviderConnection {
  id: string;
  providerId: string;
  displayName: string;
  maskedKey: string;
  region: string;
  customBaseUrl?: string;
  status: ConnectionStatus;
  lastTestedAt?: string | null;
  lastSuccessAt?: string | null;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  dailyJobLimit: number;
  monthlyJobLimit: number;
  maxCostPerProject: number;
  blockPaidOrUnknownProviders: boolean;
  isEnabled: boolean;
  createdAt?: string;
}

export interface CreateProviderConnectionInput {
  providerId: string;
  displayName: string;
  apiKey: string;
  region?: string;
  customBaseUrl?: string;
  dailyJobLimit?: number;
  monthlyJobLimit?: number;
  maxCostPerProject?: number;
  blockPaidOrUnknownProviders?: boolean;
}

export interface UpdateProviderConnectionInput {
  displayName?: string;
  apiKey?: string;
  region?: string;
  customBaseUrl?: string;
  dailyJobLimit?: number;
  monthlyJobLimit?: number;
  maxCostPerProject?: number;
  blockPaidOrUnknownProviders?: boolean;
  isEnabled?: boolean;
}

export interface TestConnectionResult {
  connectionId: string;
  providerId: string;
  status: ConnectionStatus;
  isValid: boolean;
  message: string;
  latencyMs: number;
  testedAt: string;
}

