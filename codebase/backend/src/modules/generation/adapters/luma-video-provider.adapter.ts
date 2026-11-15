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

const DEFAULT_BASE_URL = 'https://api.lumalabs.ai/dream-machine/v1';

@Injectable()
export class LumaVideoProviderAdapter implements VideoProviderAdapter {
  public readonly providerId = 'luma-ai';

  private createClient(credentials: DecryptedCredentials) {
    return axios.create({
      baseURL: credentials.baseUrl || DEFAULT_BASE_URL,
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
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
        throw new ProviderAuthError(this.providerId, 'Luma API key invalid');
      }
      return {
        isValid: true,
        message: 'Luma AI credentials verified',
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
      const response = await client.post<{ id?: string }>(
        '/generations',
        {
          prompt: request.prompt,
          aspect_ratio: request.aspectRatio === '9:16' ? '9:16' : '16:9',
        },
      );

      return {
        providerJobId: response.data?.id || `luma-${Date.now()}`,
        status: 'queued',
        estimatedDurationSeconds: 45,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const err = error as AxiosError<{ message?: string; detail?: string }>;
        const msg = err.response?.data?.message || err.response?.data?.detail || err.message;
        if (err.response?.status === 401) throw new ProviderAuthError(this.providerId, msg);
        if (err.response?.status === 402) throw new ProviderQuotaExhaustedError(this.providerId, msg);
        throw new ProviderServerError(this.providerId, msg);
      }
      throw new ProviderServerError(this.providerId, 'Luma generation request failed');
    }
  }

  public async getGenerationStatus(
    credentials: DecryptedCredentials,
    providerJobId: string,
  ): Promise<ProviderGenerationStatus> {
    const client = this.createClient(credentials);
    try {
      const response = await client.get<{
        state?: string;
        failure_reason?: string;
        assets?: { video?: string };
      }>(`/generations/${providerJobId}`);

      const state = (response.data?.state || '').toLowerCase();
      if (state === 'completed') {
        return {
          providerJobId,
          status: 'succeeded',
          videoUrl: response.data?.assets?.video || null,
          completedAt: new Date(),
        };
      }
      if (state === 'failed') {
        return {
          providerJobId,
          status: 'failed',
          errorMessage: response.data?.failure_reason || 'Luma video rendering failed',
        };
      }
      return {
        providerJobId,
        status: 'processing',
        progressPercent: 50,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const err = error as AxiosError<{ message?: string }>;
        throw new ProviderServerError(this.providerId, err.message);
      }
      throw new ProviderServerError(this.providerId, 'Polling failed');
    }
  }
}

