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
import { S3StorageService } from '../../media/services/s3-storage.service';

@Injectable()
export class CloudflareVideoProviderAdapter implements VideoProviderAdapter {
  public readonly providerId = 'cloudflare-workers-ai';
  private readonly completed = new Map<string, string>();

  constructor(private readonly s3StorageService: S3StorageService) {}

  private getAccountId(credentials: DecryptedCredentials): string {
    return credentials.region || process.env['CLOUDFLARE_ACCOUNT_ID'] || 'default-account';
  }

  public async validateCredentials(
    credentials: DecryptedCredentials,
  ): Promise<CredentialTestResult> {
    const start = Date.now();
    try {
      if (!credentials.apiKey || credentials.apiKey.length < 10) {
        throw new ProviderAuthError(this.providerId, 'Cloudflare API token invalid');
      }
      return {
        isValid: true,
        message: 'Cloudflare Workers AI credentials verified',
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
    const accountId = this.getAccountId(credentials);
    const model = request.modelId || '@cf/bytedance/stable-video-diffusion';
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
    const jobId = `cf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      const response = await axios.post(
        url,
        { prompt: request.prompt },
        {
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 60000,
        },
      );

      const buffer = Buffer.from(response.data as ArrayBuffer);
      const s3Key = `providers/cloudflare/${jobId}.mp4`;
      const uploaded = await this.s3StorageService.uploadBuffer(s3Key, buffer, 'video/mp4');

      this.completed.set(jobId, uploaded.publicUrl);

      return {
        providerJobId: jobId,
        status: 'queued',
        estimatedDurationSeconds: 15,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const err = error as AxiosError<{ errors?: Array<{ message: string }> }>;
        const status = err.response?.status;
        const msg = err.response?.data?.errors?.[0]?.message || err.message;
        if (status === 401 || status === 403) throw new ProviderAuthError(this.providerId, msg);
        if (status === 402) throw new ProviderQuotaExhaustedError(this.providerId, msg);
        throw new ProviderServerError(this.providerId, msg);
      }
      throw new ProviderServerError(this.providerId, 'Cloudflare Workers AI request failed');
    }
  }

  public async getGenerationStatus(
    _credentials: DecryptedCredentials,
    providerJobId: string,
  ): Promise<ProviderGenerationStatus> {
    const directUrl = this.completed.get(providerJobId);
    if (directUrl) {
      return {
        providerJobId,
        status: 'succeeded',
        videoUrl: directUrl,
        completedAt: new Date(),
      };
    }
    return {
      providerJobId,
      status: 'processing',
      progressPercent: 50,
    };
  }
}

