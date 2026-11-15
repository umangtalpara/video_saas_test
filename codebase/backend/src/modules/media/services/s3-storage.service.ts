import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3UploadResult {
  bucket: string;
  s3Key: string;
  publicUrl: string;
  fileSizeBytes: number;
}

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cloudfrontDomain: string;

  constructor(private readonly configService: ConfigService) {
    this.region =
      this.configService.get<string>('S3_REGION') ||
      process.env['S3_REGION'] ||
      this.configService.get<string>('AWS_REGION') ||
      'ap-south-1';
    this.bucket =
      this.configService.get<string>('S3_BUCKET') ||
      process.env['S3_BUCKET'] ||
      this.configService.get<string>('AWS_S3_BUCKET') ||
      'videoforge-assets';
    this.cloudfrontDomain =
      this.configService.get<string>('AWS_CLOUDFRONT_DOMAIN') ||
      process.env['AWS_CLOUDFRONT_DOMAIN'] ||
      '';

    const accessKeyId =
      this.configService.get<string>('S3_ACCESS_KEY_ID') ||
      process.env['S3_ACCESS_KEY_ID'] ||
      this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey =
      this.configService.get<string>('S3_SECRET_ACCESS_KEY') ||
      process.env['S3_SECRET_ACCESS_KEY'] ||
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log(`Initialized native AWS S3 client for bucket "${this.bucket}" in region "${this.region}"`);
    } else {
      this.logger.warn('AWS S3 credentials not fully configured, running in simulated S3 storage mode');
    }
  }

  public getBucketName(): string {
    return this.bucket;
  }

  public buildSceneKey(userId: string, projectId: string, sceneId: string): string {
    return `users/${userId}/projects/${projectId}/scenes/${sceneId}.mp4`;
  }

  public buildFinalVideoKey(userId: string, projectId: string): string {
    return `users/${userId}/projects/${projectId}/final/render.mp4`;
  }

  public async uploadSceneClip(
    userId: string,
    projectId: string,
    sceneId: string,
    buffer: Buffer,
    mimeType: string = 'video/mp4',
  ): Promise<S3UploadResult> {
    const s3Key = this.buildSceneKey(userId, projectId, sceneId);
    return this.uploadBuffer(s3Key, buffer, mimeType);
  }

  public async uploadBuffer(
    s3Key: string,
    buffer: Buffer,
    mimeType: string = 'video/mp4',
  ): Promise<S3UploadResult> {
    if (this.s3Client) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: s3Key,
            Body: buffer,
            ContentType: mimeType,
          }),
        );
      } catch (err: unknown) {
        this.logger.error(
          `S3 upload failure for key: ${s3Key}`,
          err instanceof Error ? err.stack : String(err),
        );
        throw err;
      }
    }

    const publicUrl = this.cloudfrontDomain
      ? `https://${this.cloudfrontDomain}/${s3Key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${s3Key}`;

    return {
      bucket: this.bucket,
      s3Key,
      publicUrl,
      fileSizeBytes: buffer.length,
    };
  }

  public async deleteObject(s3Key: string): Promise<boolean> {
    if (this.s3Client) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: s3Key,
          }),
        );
      } catch (err: unknown) {
        this.logger.warn(`Failed to delete S3 object: ${s3Key}`);
        return false;
      }
    }
    return true;
  }

  public async generatePresignedGetUrl(
    s3Key: string,
    expiresInSeconds: number = 3600,
    downloadFileName?: string,
  ): Promise<string> {
    if (this.s3Client) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          ResponseContentDisposition: downloadFileName
            ? `attachment; filename="${downloadFileName}"`
            : undefined,
        });
        return await getSignedUrl(this.s3Client, command, {
          expiresIn: expiresInSeconds,
        });
      } catch (err: unknown) {
        this.logger.error(`Failed to generate presigned S3 URL: ${err}`);
      }
    }

    const base = this.cloudfrontDomain
      ? `https://${this.cloudfrontDomain}/${s3Key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${s3Key}`;

    const params = new URLSearchParams();
    params.set('expires', String(Date.now() + expiresInSeconds * 1000));
    if (downloadFileName) {
      params.set('filename', downloadFileName);
    }
    return `${base}?${params.toString()}`;
  }
}

