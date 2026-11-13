import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';
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
  ProviderPolicyError,
  ProviderQuotaExhaustedError,
  ProviderRateLimitError,
  ProviderServerError,
} from './errors/provider-error';

const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';

@Injectable()
export class WanVideoProviderAdapter implements VideoProviderAdapter {
  public readonly providerId = 'wan';
  private readonly logger = new Logger(WanVideoProviderAdapter.name);

  private createClient(credentials: DecryptedCredentials): AxiosInstance {
    const baseURL = credentials.baseUrl || DEFAULT_BASE_URL;
    return axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosErr = error as AxiosError<{ code?: string; message?: string }>;
      const status = axiosErr.response?.status;
      const code = axiosErr.response?.data?.code || '';
      const msg = axiosErr.response?.data?.message || axiosErr.message;

      if (status === 401 || code.includes('InvalidApiKey')) {
        throw new ProviderAuthError(this.providerId, msg);
      }
      if (status === 402 || code.includes('QuotaExhausted') || code.includes('Arrearage')) {
        throw new ProviderQuotaExhaustedError(this.providerId, msg);
      }
      if (status === 429 || code.includes('RateLimit')) {
        throw new ProviderRateLimitError(this.providerId, msg);
      }
      if (code.includes('ContentFilter') || code.includes('PolicyViolation')) {
        throw new ProviderPolicyError(this.providerId, msg);
      }
      throw new ProviderServerError(this.providerId, msg);
    }
    throw new ProviderServerError(
      this.providerId,
      error instanceof Error ? error.message : 'Unknown network failure',
    );
  }

  public async validateCredentials(
    credentials: DecryptedCredentials,
  ): Promise<CredentialTestResult> {
    const start = Date.now();
    try {
      if (!credentials.apiKey || credentials.apiKey.length < 10) {
        throw new ProviderAuthError(this.providerId, 'API key is too short or malformed');
      }
      const client = this.createClient(credentials);
      await client.get('/tasks/ping_validation_probe', {
        validateStatus: (s: number) => s === 404 || s === 400 || s === 200,
      });

      return {
        isValid: true,
        message: 'Alibaba Cloud Model Studio (Wan) key verified successfully',
        latencyMs: Date.now() - start,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Validation failed';
      return { isValid: false, message: msg, latencyMs: Date.now() - start };
    }
  }

  public async generateVideo(
    credentials: DecryptedCredentials,
    request: VideoGenerationRequest,
    idempotencyKey: string,
  ): Promise<ProviderGenerationAccepted> {
    const client = this.createClient(credentials);
    const model = request.modelId || 'wan2.1-t2v-turbo';
    const size = request.aspectRatio === '9:16' ? '720*1280' : '1280*720';

    try {
      const response = await client.post<{
        output?: { task_id?: string; task_status?: string };
        request_id?: string;
      }>(
        '/services/aigc/video-generation/generation',
        {
          model,
          input: {
            prompt: request.prompt,
            negative_prompt: request.negativePrompt,
          },
          parameters: {
            size,
            duration: request.durationSeconds || 5,
          },
        },
        {
          headers: {
            'X-DashScope-Async': 'enable',
            'X-Idempotency-Key': idempotencyKey,
          },
        },
      );

      const taskId = response.data?.output?.task_id;
      if (!taskId) {
        throw new ProviderServerError(this.providerId, 'Missing task_id in provider response');
      }

      return {
        providerJobId: taskId,
        status: 'queued',
        estimatedDurationSeconds: 45,
        rawResponse: response.data as Record<string, unknown>,
      };
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  public async getGenerationStatus(
    credentials: DecryptedCredentials,
    providerJobId: string,
  ): Promise<ProviderGenerationStatus> {
    const client = this.createClient(credentials);
    try {
      const response = await client.get<{
        output?: {
          task_id?: string;
          task_status?: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
          video_url?: string;
          message?: string;
          code?: string;
        };
      }>(`/tasks/${providerJobId}`);

      const output = response.data?.output;
      const taskStatus = output?.task_status || 'PENDING';

      if (taskStatus === 'SUCCEEDED') {
        return {
          providerJobId,
          status: 'succeeded',
          progressPercent: 100,
          videoUrl: output?.video_url || null,
          completedAt: new Date(),
          rawResponse: response.data as Record<string, unknown>,
        };
      }

      if (taskStatus === 'FAILED' || taskStatus === 'CANCELED') {
        return {
          providerJobId,
          status: 'failed',
          errorCode: output?.code || 'GENERATION_FAILED',
          errorMessage: output?.message || 'Remote task failed',
          rawResponse: response.data as Record<string, unknown>,
        };
      }

      return {
        providerJobId,
        status: taskStatus === 'RUNNING' ? 'processing' : 'queued',
        progressPercent: taskStatus === 'RUNNING' ? 50 : 10,
        rawResponse: response.data as Record<string, unknown>,
      };
    } catch (err: unknown) {
      this.handleError(err);
    }
  }
}
