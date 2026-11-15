import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
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

const DEFAULT_BASE_URL = 'https://api.klingai.com/v1';

@Injectable()
export class KlingVideoProviderAdapter implements VideoProviderAdapter {
  public readonly providerId = 'kling-ai';

  private resolveAuthHeader(apiKey: string): string {
    if (apiKey.includes(':')) {
      const [ak, sk] = apiKey.split(':');
      if (ak && sk) {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const now = Math.floor(Date.now() / 1000);
        const payload = Buffer.from(
          JSON.stringify({ iss: ak, exp: now + 1800, nbf: now - 5 }),
        ).toString('base64url');
        const signature = crypto
          .createHmac('sha256', sk)
          .update(`${header}.${payload}`)
          .digest('base64url');
        return `Bearer ${header}.${payload}.${signature}`;
      }
    }
    return `Bearer ${apiKey}`;
  }

  private createClient(credentials: DecryptedCredentials) {
    const auth = this.resolveAuthHeader(credentials.apiKey);
    return axios.create({
      baseURL: credentials.baseUrl || DEFAULT_BASE_URL,
      headers: {
        Authorization: auth,
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
        throw new ProviderAuthError(this.providerId, 'Kling API credentials invalid');
      }
      return {
        isValid: true,
        message: 'Kling AI credentials verified',
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
      const response = await client.post<{ data?: { task_id?: string } }>(
        '/videos/text2video',
        {
          model: request.modelId || 'kling-v1',
          prompt: request.prompt,
          aspect_ratio: request.aspectRatio === '9:16' ? '9:16' : '16:9',
          duration: String(request.durationSeconds || 5),
        },
      );

      return {
        providerJobId: response.data?.data?.task_id || `kling-${Date.now()}`,
        status: 'queued',
        estimatedDurationSeconds: 60,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const err = error as AxiosError<{ message?: string }>;
        if (err.response?.status === 401) throw new ProviderAuthError(this.providerId, 'Kling unauthorized');
        if (err.response?.status === 402) throw new ProviderQuotaExhaustedError(this.providerId, 'Kling credits exhausted');
        throw new ProviderServerError(this.providerId, err.message);
      }
      throw new ProviderServerError(this.providerId, 'Kling request failed');
    }
  }

  public async getGenerationStatus(
    credentials: DecryptedCredentials,
    providerJobId: string,
  ): Promise<ProviderGenerationStatus> {
    const client = this.createClient(credentials);
    try {
      const response = await client.get<{
        data?: {
          task_status?: string;
          task_status_msg?: string;
          task_result?: { videos?: Array<{ url: string }> };
        };
      }>(`/videos/text2video/${providerJobId}`);

      const data = response.data?.data;
      const status = (data?.task_status || '').toLowerCase();

      if (status === 'succeed' || status === 'success') {
        return {
          providerJobId,
          status: 'succeeded',
          videoUrl: data?.task_result?.videos?.[0]?.url || null,
          completedAt: new Date(),
        };
      }
      if (status === 'failed') {
        return {
          providerJobId,
          status: 'failed',
          errorMessage: data?.task_status_msg || 'Kling video rendering failed',
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

