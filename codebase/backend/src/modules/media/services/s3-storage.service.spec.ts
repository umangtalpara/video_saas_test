import { ConfigService } from '@nestjs/config';
import { S3StorageService } from './s3-storage.service';

describe('S3StorageService', () => {
  let service: S3StorageService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'AWS_REGION') return 'us-east-1';
        if (key === 'AWS_S3_BUCKET') return 'test-videoforge-bucket';
        if (key === 'AWS_CLOUDFRONT_DOMAIN') return 'cdn.videoforge.ai';
        return null;
      }),
    };

    service = new S3StorageService(mockConfigService as ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.getBucketName()).toBe('test-videoforge-bucket');
  });

  describe('key naming and tenant isolation', () => {
    it('should generate tenant-isolated scene clip S3 key', () => {
      const key = service.buildSceneKey('user123', 'proj456', 'scene789');
      expect(key).toBe('users/user123/projects/proj456/scenes/scene789.mp4');
    });

    it('should generate tenant-isolated final video S3 key', () => {
      const key = service.buildFinalVideoKey('user123', 'proj456');
      expect(key).toBe('users/user123/projects/proj456/final/render.mp4');
    });
  });

  describe('uploadBuffer', () => {
    it('should return S3UploadResult with cloudfront URL when configured', async () => {
      const buffer = Buffer.from('test-video-bytes');
      const res = await service.uploadBuffer('users/u1/projects/p1/scenes/s1.mp4', buffer);

      expect(res.bucket).toBe('test-videoforge-bucket');
      expect(res.s3Key).toBe('users/u1/projects/p1/scenes/s1.mp4');
      expect(res.publicUrl).toBe('https://cdn.videoforge.ai/users/u1/projects/p1/scenes/s1.mp4');
      expect(res.fileSizeBytes).toBe(buffer.length);
    });
  });

  describe('generatePresignedGetUrl', () => {
    it('should generate expiring presigned GET URL with download disposition', async () => {
      const url = await service.generatePresignedGetUrl(
        'users/u1/projects/p1/final/render.mp4',
        1800,
        'my_video.mp4',
      );
      expect(url).toContain('https://cdn.videoforge.ai/users/u1/projects/p1/final/render.mp4');
      expect(url).toContain('expires=');
      expect(url).toContain('filename=my_video.mp4');
    });
  });
});
