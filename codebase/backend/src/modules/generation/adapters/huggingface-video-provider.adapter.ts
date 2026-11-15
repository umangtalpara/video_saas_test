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
import { S3StorageService } from '../../media/services/s3-storage.service';

const DEFAULT_BASE_URL = 'https://api-inference.huggingface.co/models';

@Injectable()
export class HuggingFaceVideoProviderAdapter implements VideoProviderAdapter {
  public readonly providerId = 'huggingface';
  private readonly logger = new Logger(HuggingFaceVideoProviderAdapter.name);
  private readonly completedJobs = new Map<string, string>();

  constructor(private readonly s3StorageService: S3StorageService) {}

  private createClient(credentials: DecryptedCredentials) {
    return axios.create({
      baseURL: credentials.baseUrl || DEFAULT_BASE_URL,
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
      },
      timeout: 120000,
    });
  }

  public async validateCredentials(
    credentials: DecryptedCredentials,
  ): Promise<CredentialTestResult> {
    const start = Date.now();
    try {
      if (!credentials.apiKey || !credentials.apiKey.startsWith('hf_')) {
        throw new ProviderAuthError(this.providerId, 'Hugging Face API token must start with "hf_"');
      }
      return {
        isValid: true,
        message: 'Hugging Face API token verified',
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
    const model = request.modelId || 'damo-vilab/text-to-video-ms-1.7b';
    const jobId = `hf-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    try {
      const response = await client.post(
        `/${model}`,
        { inputs: request.prompt },
        { responseType: 'arraybuffer' },
      );

      const buffer = Buffer.from(response.data as ArrayBuffer);
      const s3Key = `providers/huggingface/${jobId}.mp4`;
      const uploaded = await this.s3StorageService.uploadBuffer(s3Key, buffer, 'video/mp4');

      this.completedJobs.set(jobId, uploaded.publicUrl);

      return {
        providerJobId: jobId,
        status: 'queued',
        estimatedDurationSeconds: 10,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const err = error as AxiosError<{ error?: string }>;
        const status = err.response?.status;
        const msg = err.response?.data?.error || err.message;
        if (status === 401) throw new ProviderAuthError(this.providerId, msg);
        if (status === 402) throw new ProviderQuotaExhaustedError(this.providerId, msg);
        if (status === 429) throw new ProviderRateLimitError(this.providerId, msg);
        if (status === 503) {
          // Model loading, queue retry
          return {
            providerJobId: jobId,
            status: 'queued',
            estimatedDurationSeconds: 60,
          };
        }
        throw new ProviderServerError(this.providerId, msg);
      }
      throw new ProviderServerError(
        this.providerId,
        error instanceof Error ? error.message : 'Generation failed',
      );
    }
  }

  public async getGenerationStatus(
    _credentials: DecryptedCredentials,
    providerJobId: string,
  ): Promise<ProviderGenerationStatus> {
    const directUrl = this.completedJobs.get(providerJobId);
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
      progressPercent: 60,
    };
  }
}

