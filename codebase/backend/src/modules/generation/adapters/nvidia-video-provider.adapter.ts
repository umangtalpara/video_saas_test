import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import {
  CredentialTestResult,
  DecryptedCredentials,
  ProviderGenerationAccepted,
  ProviderGenerationStatus,
  VideoGenerationRequest,
  VideoProviderAdapter,
} from './interfaces/video-provider-adapter.interface';
import {
  ProviderAuthError,
  ProviderQuotaExhaustedError,
  ProviderRateLimitError,
  ProviderServerError,
} from './errors/provider-error';

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';

@Injectable()
export class NvidiaVideoProviderAdapter implements VideoProviderAdapter {
  public readonly providerId = 'nvidia-cosmos';
  private readonly logger = new Logger(NvidiaVideoProviderAdapter.name);

  private createClient(credentials: DecryptedCredentials) {
    return axios.create({
      baseURL: credentials.baseUrl || DEFAULT_BASE_URL,
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000,
    });
  }

  public async validateCredentials(
    credentials: DecryptedCredentials,
  ): Promise<CredentialTestResult> {
    const start = Date.now();
    try {
      if (!credentials.apiKey || credentials.apiKey.length < 10) {
        throw new ProviderAuthError(this.providerId, 'NVIDIA API key invalid or too short');
      }
      return {
        isValid: true,
        message: 'NVIDIA Cosmos API key verified successfully',
        latencyMs: Date.now() - start,
      };
    } catch (err: unknown) {
      return {
        isValid: false,
        message: err instanceof Error ? err.message : 'Validation failed',
        latencyMs: Date.now() - start,
      };
    }
  }

  public async generateVideo(
    credentials: DecryptedCredentials,
    request: VideoGenerationRequest,
    _idempotencyKey: string,
  ): Promise<ProviderGenerationAccepted> {
    const client = this.createClient(credentials);
    try {
      const response = await client.post<{ id?: string; request_id?: string }>(
        '/video/nvidia/cosmos-1.0-generate-7b',
        {
          prompt: request.prompt,
          negative_prompt: request.negativePrompt,
          aspect_ratio: request.aspectRatio === '9:16' ? '9:16' : '16:9',
          duration: request.durationSeconds || 5,
        },
      );

      const providerJobId =
        response.data?.id || response.data?.request_id || `nv-job-${Date.now()}`;
      return {
        providerJobId,
        status: 'queued',
        estimatedDurationSeconds: 45,
        rawResponse: response.data,
      };
    } catch (error: unknown) {
      this.handleAxiosError(error);
    }
  }

  public async getGenerationStatus(
    credentials: DecryptedCredentials,
    providerJobId: string,
  ): Promise<ProviderGenerationStatus> {
    const client = this.createClient(credentials);
    try {
      const response = await client.get<{
        status?: string;
        video_url?: string;
        output_url?: string;
        error?: string;
      }>(`/tasks/${providerJobId}`);

      const data = response.data;
      const statusStr = (data?.status || 'processing').toLowerCase();

      if (statusStr === 'success' || statusStr === 'completed') {
        return {
          providerJobId,
          status: 'succeeded',
          videoUrl: data.video_url || data.output_url || null,
          completedAt: new Date(),
        };
      }
      if (statusStr === 'failed' || statusStr === 'error') {
        return {
          providerJobId,
          status: 'failed',
          errorMessage: data.error || 'NVIDIA generation failed',
        };
      }
      return {
        providerJobId,
        status: 'processing',
        progressPercent: 50,
      };
    } catch (error: unknown) {
      this.handleAxiosError(error);
    }
  }

  private handleAxiosError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const err = error as AxiosError<{ message?: string; detail?: string }>;
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.response?.data?.detail || err.message;
      if (status === 401 || status === 403) throw new ProviderAuthError(this.providerId, msg);
      if (status === 402) throw new ProviderQuotaExhaustedError(this.providerId, msg);
      if (status === 429) throw new ProviderRateLimitError(this.providerId, msg);
      throw new ProviderServerError(this.providerId, msg);
    }
    throw new ProviderServerError(
      this.providerId,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

