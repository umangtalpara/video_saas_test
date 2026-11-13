export type ProviderType = 'direct' | 'aggregator';

export type AuthType = 'bearer' | 'api_key_header' | 'query_parameter' | 'custom';

export type BillingClassification =
  | 'free_verified'
  | 'trial'
  | 'paid'
  | 'unknown'
  | 'user_managed';

export interface Provider {
  providerId: string;
  displayName: string;
  company: string;
  country: string;
  providerType: ProviderType;
  documentationUrl: string;
  apiBaseUrl: string;
  authType: AuthType;
  authHeaderName: string;
  capabilities: string[];
  billingClassification: BillingClassification;
  freeQuotaPolicy: Record<string, unknown>;
  isEnabled: boolean;
  isMaintenance: boolean;
  termsNotes: string;
  regionRestrictions: string[];
  createdAt?: string;
}

export interface ProviderModel {
  providerId: string;
  modelId: string;
  displayName: string;
  description: string;
  capabilities: string[];
  supportedAspectRatios: string[];
  supportedResolutions: string[];
  minDurationSeconds: number;
  maxDurationSeconds: number;
  isAsync: boolean;
  estimatedCostPerSecond: number;
  freeQuotaEligible: boolean;
  isEnabled: boolean;
  createdAt?: string;
}
