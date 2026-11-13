import { Injectable } from '@nestjs/common';
import {
  CredentialTestResult,
  DecryptedCredentials,
  ProviderGenerationAccepted,
  ProviderGenerationStatus,
  VideoGenerationRequest,
  VideoProviderAdapter,
} from './interfaces/video-provider-adapter.interface';
import { ProviderAuthError } from './errors/provider-error';

@Injectable()
export class MockVideoProviderAdapter implements VideoProviderAdapter {
  public readonly providerId = 'mock';

  public async validateCredentials(
    credentials: DecryptedCredentials,
  ): Promise<CredentialTestResult> {
    if (!credentials.apiKey || credentials.apiKey.includes('invalid')) {
      throw new ProviderAuthError(this.providerId, 'Mock API key rejected');
    }
    return {
      isValid: true,
      message: 'Mock provider credentials verified',
      latencyMs: 15,
    };
  }

  public async generateVideo(
    _credentials: DecryptedCredentials,
    request: VideoGenerationRequest,
    _idempotencyKey: string,
  ): Promise<ProviderGenerationAccepted> {
    const isFail = request.prompt.toLowerCase().includes('fail');
    const jobId = isFail ? `mock-fail-${Date.now()}` : `mock-job-${Date.now()}`;

    return {
      providerJobId: jobId,
      status: 'queued',
      estimatedDurationSeconds: 5,
    };
  }

  public async getGenerationStatus(
    _credentials: DecryptedCredentials,
    providerJobId: string,
  ): Promise<ProviderGenerationStatus> {
    if (providerJobId.includes('fail')) {
      return {
        providerJobId,
        status: 'failed',
        errorCode: 'MOCK_INDUCED_FAILURE',
        errorMessage: 'Mock prompt requested failure condition',
      };
    }

    return {
      providerJobId,
      status: 'succeeded',
      progressPercent: 100,
      videoUrl: 'https://mock-assets.videoforge.ai/clips/sample-scene.mp4',
      completedAt: new Date(),
    };
  }

  public async cancelJob(
    _credentials: DecryptedCredentials,
    _providerJobId: string,
  ): Promise<boolean> {
    return true;
  }
}
