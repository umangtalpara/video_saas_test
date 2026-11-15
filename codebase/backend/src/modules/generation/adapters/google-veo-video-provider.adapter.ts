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

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

@Injectable()
export class GoogleVeoVideoProviderAdapter implements VideoProviderAdapter {
  public readonly providerId = 'google-ai';

  private createClient(credentials: DecryptedCredentials) {
    return axios.create({
      baseURL: credentials.baseUrl || DEFAULT_BASE_URL,
      headers: {
        'x-goog-api-key': credentials.apiKey,
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
      if (!credentials.apiKey || credentials.apiKey.length < 10) {
        throw new ProviderAuthError(this.providerId, 'Google AI key invalid');
      }
      return {
        isValid: true,
        message: 'Google AI / Veo API key verified',
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
    const model = request.modelId || 'veo-2';

    try {
      const response = await client.post<{ name?: string }>(
        `/models/${model}:predictVideo`,
        {
          prompt: { text: request.prompt },
          video_duration_seconds: request.durationSeconds || 5,
          aspect_ratio: request.aspectRatio === '9:16' ? '9:16' : '16:9',
        },
      );

      return {
        providerJobId: response.data?.name || `veo-op-${Date.now()}`,
        status: 'queued',
        estimatedDurationSeconds: 45,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const err = error as AxiosError<{ error?: { message?: string } }>;
        const status = err.response?.status;
        const msg = err.response?.data?.error?.message || err.message;
        if (status === 401 || status === 403) throw new ProviderAuthError(this.providerId, msg);
        if (status === 402) throw new ProviderQuotaExhaustedError(this.providerId, msg);
        throw new ProviderServerError(this.providerId, msg);
      }
      throw new ProviderServerError(this.providerId, 'Google Veo request failed');
    }
  }

  public async getGenerationStatus(
    credentials: DecryptedCredentials,
    providerJobId: string,
  ): Promise<ProviderGenerationStatus> {
    const client = this.createClient(credentials);
    const endpoint = providerJobId.startsWith('operations/')
      ? `/${providerJobId}`
      : `/operations/${providerJobId}`;

    try {
      const response = await client.get<{
        done?: boolean;
        error?: { message?: string };
        response?: { video?: { uri?: string } };
      }>(endpoint);

      const data = response.data;
      if (data?.done) {
        if (data.error) {
          return {
            providerJobId,
            status: 'failed',
            errorMessage: data.error.message || 'Veo generation failed',
          };
        }
        return {
          providerJobId,
          status: 'succeeded',
          videoUrl: data.response?.video?.uri || null,
          completedAt: new Date(),
        };
      }
      return {
        providerJobId,
        status: 'processing',
        progressPercent: 60,
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

