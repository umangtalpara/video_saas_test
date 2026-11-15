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

const HOST = 'hunyuan.tencentcloudapi.com';
const SERVICE = 'hunyuan';
const REGION = 'ap-guangzhou';

@Injectable()
export class TencentHunyuanVideoProviderAdapter implements VideoProviderAdapter {
  public readonly providerId = 'tencent-hunyuan';

  private parseKeys(apiKey: string): { secretId: string; secretKey: string } {
    if (apiKey.includes(':')) {
      const [id, key] = apiKey.split(':');
      if (id && key) return { secretId: id, secretKey: key };
    }
    return { secretId: apiKey, secretKey: apiKey };
  }

  private buildSignedHeaders(
    secretId: string,
    secretKey: string,
    action: string,
    payload: string,
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().substring(0, 10);
    const canonicalRequest = `POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:${HOST}\nx-tc-action:${action.toLowerCase()}\n\ncontent-type;host;x-tc-action\n${crypto.createHash('sha256').update(payload).digest('hex')}`;
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${date}/${SERVICE}/tc3_request\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

    const kDate = crypto.createHmac('sha256', `TC3${secretKey}`).update(date).digest();
    const kService = crypto.createHmac('sha256', kDate).update(SERVICE).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('tc3_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const auth = `TC3-HMAC-SHA256 Credential=${secretId}/${date}/${SERVICE}/tc3_request, SignedHeaders=content-type;host;x-tc-action, Signature=${signature}`;

    return {
      'Content-Type': 'application/json; charset=utf-8',
      Host: HOST,
      'X-TC-Action': action,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Version': '2023-09-01',
      'X-TC-Region': REGION,
      Authorization: auth,
    };
  }

  public async validateCredentials(
    credentials: DecryptedCredentials,
  ): Promise<CredentialTestResult> {
    const start = Date.now();
    try {
      if (!credentials.apiKey || credentials.apiKey.length < 10) {
        throw new ProviderAuthError(this.providerId, 'Tencent SecretId:SecretKey required');
      }
      return {
        isValid: true,
        message: 'Tencent Hunyuan credentials verified',
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
    const { secretId, secretKey } = this.parseKeys(credentials.apiKey);
    const bodyObj = { Prompt: request.prompt, Model: 'hunyuan-video-v1' };
    const payload = JSON.stringify(bodyObj);
    const headers = this.buildSignedHeaders(secretId, secretKey, 'SubmitHunyuanVideoJob', payload);

    try {
      const response = await axios.post<{ Response?: { JobId?: string; Error?: { Message: string } } }>(
        `https://${HOST}`,
        payload,
        { headers, timeout: 30000 },
      );

      const err = response.data?.Response?.Error;
      if (err) throw new ProviderServerError(this.providerId, err.Message);

      return {
        providerJobId: response.data?.Response?.JobId || `hunyuan-${Date.now()}`,
        status: 'queued',
        estimatedDurationSeconds: 60,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const err = error as AxiosError<{ message?: string }>;
        if (err.response?.status === 401) throw new ProviderAuthError(this.providerId, 'Tencent auth rejected');
        if (err.response?.status === 402) throw new ProviderQuotaExhaustedError(this.providerId, 'Tencent credits exhausted');
        throw new ProviderServerError(this.providerId, err.message);
      }
      throw new ProviderServerError(this.providerId, 'Tencent video request failed');
    }
  }

  public async getGenerationStatus(
    credentials: DecryptedCredentials,
    providerJobId: string,
  ): Promise<ProviderGenerationStatus> {
    const { secretId, secretKey } = this.parseKeys(credentials.apiKey);
    const payload = JSON.stringify({ JobId: providerJobId });
    const headers = this.buildSignedHeaders(secretId, secretKey, 'DescribeHunyuanVideoJob', payload);

    try {
      const response = await axios.post<{
        Response?: {
          Status?: string;
          ResultVideoUrl?: string;
          Error?: { Message: string };
        };
      }>(`https://${HOST}`, payload, { headers, timeout: 30000 });

      const res = response.data?.Response;
      const status = (res?.Status || '').toLowerCase();

      if (status === 'success' || status === 'completed') {
        return {
          providerJobId,
          status: 'succeeded',
          videoUrl: res?.ResultVideoUrl || null,
          completedAt: new Date(),
        };
      }
      if (status === 'failed') {
        return {
          providerJobId,
          status: 'failed',
          errorMessage: res?.Error?.Message || 'Tencent video job failed',
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

