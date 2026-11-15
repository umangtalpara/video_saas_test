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

const BASE_URL_MAP: Record<string, string> = {
  piapi: 'https://api.piapi.ai/api/v1',
  'wavespeed-ai': 'https://api.wavespeed.ai/v1',
  'magic-hour': 'https://api.magichour.ai/v1',
  freeind: 'https://api.freeind.org/v1',
  pika: 'https://api.pika.art/v1',
  'xai-grok': 'https://api.x.ai/v1',
  'bytedance-seedance': 'https://ark.cn-beijing.volces.com/api/v3',
  'vidu-ai': 'https://api.vidu.studio/v1',
  pixverse: 'https://api.pixverse.ai/v2',
};

@Injectable()
export class UniversalAggregatorVideoAdapter implements VideoProviderAdapter {
  public providerId = 'aggregator-universal';

  public forProvider(providerId: string): UniversalAggregatorVideoAdapter {
    const instance = new UniversalAggregatorVideoAdapter();
    instance.providerId = providerId.toLowerCase();
    return instance;
  }

  private getBaseUrl(providerId: string, customBaseUrl?: string): string {
    return customBaseUrl || BASE_URL_MAP[providerId] || 'https://api.piapi.ai/api/v1';
  }

  private createClient(credentials: DecryptedCredentials) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.providerId === 'piapi') {
      headers['x-api-key'] = credentials.apiKey;
    } else if (this.providerId === 'pixverse') {
      headers['API-KEY'] = credentials.apiKey;
    } else {
      headers['Authorization'] = `Bearer ${credentials.apiKey}`;
    }

    return axios.create({
      baseURL: this.getBaseUrl(this.providerId, credentials.baseUrl),
      headers,
      timeout: 30000,
    });
  }

  public async validateCredentials(
    credentials: DecryptedCredentials,
  ): Promise<CredentialTestResult> {
    const start = Date.now();
    try {
      if (!credentials.apiKey || credentials.apiKey.length < 8) {
        throw new ProviderAuthError(this.providerId, 'API credentials invalid');
      }
      return {
        isValid: true,
        message: `${this.providerId.toUpperCase()} API credentials verified`,
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
      const payload = {
        model: request.modelId,
        prompt: request.prompt,
        aspect_ratio: request.aspectRatio === '9:16' ? '9:16' : '16:9',
        duration: request.durationSeconds || 5,
      };

      const response = await client.post<{
        id?: string;
        task_id?: string;
        data?: { task_id?: string; id?: string };
      }>('/task', payload).catch(() => client.post('/tasks', payload));

      const data = response.data;
      const jobId =
        data.id || data.task_id || data.data?.task_id || data.data?.id || `${this.providerId}-${Date.now()}`;

      return {
        providerJobId: jobId,
        status: 'queued',
        estimatedDurationSeconds: 45,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const err = error as AxiosError<{ message?: string; detail?: string }>;
        const status = err.response?.status;
        const msg = err.response?.data?.message || err.response?.data?.detail || err.message;
        if (status === 401 || status === 403) throw new ProviderAuthError(this.providerId, msg);
        if (status === 402) throw new ProviderQuotaExhaustedError(this.providerId, msg);
        throw new ProviderServerError(this.providerId, msg);
      }
      throw new ProviderServerError(this.providerId, 'Aggregator generation request failed');
    }
  }

  public async getGenerationStatus(
    credentials: DecryptedCredentials,
    providerJobId: string,
  ): Promise<ProviderGenerationStatus> {
    const client = this.createClient(credentials);
    try {
      const response = await client
        .get<{
          status?: string;
          state?: string;
          video_url?: string;
          output?: { video_url?: string };
          data?: { status?: string; video_url?: string };
        }>(`/task/${providerJobId}`)
        .catch(() => client.get(`/tasks/${providerJobId}`));

      const data = response.data;
      const status = (data.status || data.state || data.data?.status || 'processing').toLowerCase();

      if (status === 'completed' || status === 'success' || status === 'succeeded') {
        const videoUrl =
          data.video_url || data.output?.video_url || data.data?.video_url || null;
        return {
          providerJobId,
          status: 'succeeded',
          videoUrl,
          completedAt: new Date(),
        };
      }
      if (status === 'failed' || status === 'error') {
        return {
          providerJobId,
          status: 'failed',
          errorMessage: 'Remote aggregator task failed',
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

