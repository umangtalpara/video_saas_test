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

const DEFAULT_BASE_URL = 'https://api.minimax.chat/v1';

@Injectable()
export class MiniMaxVideoProviderAdapter implements VideoProviderAdapter {
  public readonly providerId = 'minimax-hailuo';

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
      if (!credentials.apiKey || credentials.apiKey.length < 10) {
        throw new ProviderAuthError(this.providerId, 'MiniMax API key invalid');
      }
      return {
        isValid: true,
        message: 'MiniMax Hailuo credentials verified',
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
      const response = await client.post<{ task_id?: string; base_resp?: { status_code?: number; status_msg?: string } }>(
        '/video_generation',
        {
          model: request.modelId || 'video-01',
          prompt: request.prompt,
        },
      );

      const data = response.data;
      if (data?.base_resp?.status_code && data.base_resp.status_code !== 0) {
        throw new ProviderServerError(this.providerId, data.base_resp.status_msg || 'Generation rejected');
      }

      return {
        providerJobId: data?.task_id || `minimax-${Date.now()}`,
        status: 'queued',
        estimatedDurationSeconds: 60,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const err = error as AxiosError<{ message?: string }>;
        const status = err.response?.status;
        if (status === 401) throw new ProviderAuthError(this.providerId, 'MiniMax unauthorized');
        if (status === 402) throw new ProviderQuotaExhaustedError(this.providerId, 'MiniMax quota exceeded');
        throw new ProviderServerError(this.providerId, err.message);
      }
      throw new ProviderServerError(this.providerId, 'MiniMax request failed');
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
        file_id?: string;
        download_url?: string;
      }>(`/query/video_generation?task_id=${providerJobId}`);

      const data = response.data;
      const status = (data?.status || '').toLowerCase();

      if (status === 'success' || data?.download_url) {
        return {
          providerJobId,
          status: 'succeeded',
          videoUrl: data.download_url || `https://api.minimax.chat/v1/files/retrieve?file_id=${data.file_id}`,
          completedAt: new Date(),
        };
      }
      if (status === 'failed') {
        return {
          providerJobId,
          status: 'failed',
          errorMessage: 'MiniMax video rendering failed',
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

