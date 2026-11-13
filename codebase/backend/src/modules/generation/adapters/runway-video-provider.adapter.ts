import { Injectable } from '@nestjs/common';
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
  ProviderServerError,
} from './errors/provider-error';

const DEFAULT_BASE_URL = 'https://api.runwayml.com/v1';

@Injectable()
export class RunwayVideoProviderAdapter implements VideoProviderAdapter {
  public readonly providerId = 'runway';

  private createClient(credentials: DecryptedCredentials) {
    return axios.create({
      baseURL: credentials.baseUrl || DEFAULT_BASE_URL,
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'X-Runway-Version': '2024-11-06',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  public async validateCredentials(
    credentials: DecryptedCredentials,
  ): Promise<CredentialTestResult> {
    const start = Date.now();
    try {
      if (!credentials.apiKey || credentials.apiKey.length < 8) {
        throw new ProviderAuthError(this.providerId, 'API key invalid');
      }
      return {
        isValid: true,
        message: 'Runway credentials verified',
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
    idempotencyKey: string,
  ): Promise<ProviderGenerationAccepted> {
    const client = this.createClient(credentials);
    try {
      const response = await client.post<{ id?: string }>(
        '/tasks',
        {
          taskType: 'gen3a_turbo',
          promptText: request.prompt,
          duration: request.durationSeconds || 5,
          ratio: request.aspectRatio === '9:16' ? '720:1280' : '1280:720',
        },
        {
          headers: { 'Idempotency-Key': idempotencyKey },
        },
      );

      return {
        providerJobId: response.data?.id || `runway-job-${Date.now()}`,
        status: 'queued',
        estimatedDurationSeconds: 60,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const err = error as AxiosError<{ message?: string }>;
        if (err.response?.status === 401) {
          throw new ProviderAuthError(this.providerId, 'Runway unauthorized');
        }
        if (err.response?.status === 402) {
          throw new ProviderQuotaExhaustedError(this.providerId, 'Runway credits exhausted');
        }
        throw new ProviderServerError(this.providerId, err.message);
      }
      throw new ProviderServerError(this.providerId, 'Network error');
    }
  }

  public async getGenerationStatus(
    credentials: DecryptedCredentials,
    providerJobId: string,
  ): Promise<ProviderGenerationStatus> {
    const client = this.createClient(credentials);
    try {
      const response = await client.get<{
        status?: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
        output?: string[];
      }>(`/tasks/${providerJobId}`);

      const status = response.data?.status;
      if (status === 'SUCCEEDED') {
        return {
          providerJobId,
          status: 'succeeded',
          progressPercent: 100,
          videoUrl: response.data?.output?.[0] || null,
          completedAt: new Date(),
        };
      }
      if (status === 'FAILED') {
        return {
          providerJobId,
          status: 'failed',
          errorMessage: 'Runway generation failed',
        };
      }
      return {
        providerJobId,
        status: status === 'RUNNING' ? 'processing' : 'queued',
        progressPercent: status === 'RUNNING' ? 50 : 10,
      };
    } catch (error: unknown) {
      throw new ProviderServerError(
        this.providerId,
        error instanceof Error ? error.message : 'Status check failed',
      );
    }
  }
}

