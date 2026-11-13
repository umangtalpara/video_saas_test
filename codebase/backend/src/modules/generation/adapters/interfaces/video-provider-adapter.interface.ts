export interface DecryptedCredentials {
  apiKey: string;
  baseUrl?: string;
  region?: string;
  customHeaders?: Record<string, string>;
}

export interface CredentialTestResult {
  isValid: boolean;
  message: string;
  latencyMs: number;
  providerInfo?: Record<string, unknown>;
}

export interface VideoGenerationRequest {
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  durationSeconds: number;
  resolution?: string;
  imageUrl?: string;
  seed?: number;
  metadata?: Record<string, unknown>;
}

export interface ProviderGenerationAccepted {
  providerJobId: string;
  status: 'queued' | 'processing';
  estimatedDurationSeconds?: number;
  rawResponse?: Record<string, unknown>;
}

export type RemoteJobStatus = 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled';

export interface ProviderGenerationStatus {
  providerJobId: string;
  status: RemoteJobStatus;
  progressPercent?: number;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  errorCode?: string;
  errorMessage?: string;
  completedAt?: Date;
  rawResponse?: Record<string, unknown>;
}

export interface VideoProviderAdapter {
  readonly providerId: string;

  validateCredentials(
    credentials: DecryptedCredentials,
  ): Promise<CredentialTestResult>;

  generateVideo(
    credentials: DecryptedCredentials,
    request: VideoGenerationRequest,
    idempotencyKey: string,
  ): Promise<ProviderGenerationAccepted>;

  getGenerationStatus(
    credentials: DecryptedCredentials,
    providerJobId: string,
  ): Promise<ProviderGenerationStatus>;

  cancelJob?(
    credentials: DecryptedCredentials,
    providerJobId: string,
  ): Promise<boolean>;
}
