import { BadRequestException } from '@nestjs/common';
import { SafeDownloaderService } from './safe-downloader.service';

describe('SafeDownloaderService', () => {
  let service: SafeDownloaderService;

  beforeEach(() => {
    service = new SafeDownloaderService();
  });

  describe('isPrivateOrRestrictedIp', () => {
    it('should identify loopback and private IPs as restricted', () => {
      expect(service.isPrivateOrRestrictedIp('127.0.0.1')).toBe(true);
      expect(service.isPrivateOrRestrictedIp('10.0.0.5')).toBe(true);
      expect(service.isPrivateOrRestrictedIp('192.168.1.100')).toBe(true);
      expect(service.isPrivateOrRestrictedIp('172.20.0.1')).toBe(true);
      expect(service.isPrivateOrRestrictedIp('169.254.169.254')).toBe(true);
    });

    it('should allow public IPs', () => {
      expect(service.isPrivateOrRestrictedIp('8.8.8.8')).toBe(false);
      expect(service.isPrivateOrRestrictedIp('104.244.42.1')).toBe(false);
    });
  });

  describe('validateUrlSecurity', () => {
    it('should reject non-http(s) protocols', async () => {
      await expect(
        service.validateUrlSecurity('file:///etc/passwd'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.validateUrlSecurity('gopher://internal:70'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject localhost and internal hostnames', async () => {
      await expect(
        service.validateUrlSecurity('http://localhost:8080/clip.mp4'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.validateUrlSecurity('http://backend.internal/secret'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid https URLs', async () => {
      const parsed = await service.validateUrlSecurity(
        'https://dashscope-result.oss.aliyuncs.com/clip.mp4',
      );
      expect(parsed.protocol).toBe('https:');
      expect(parsed.hostname).toBe('dashscope-result.oss.aliyuncs.com');
    });
  });

  describe('downloadVideoBuffer', () => {
    it('should return mock buffer for mock assets', async () => {
      const result = await service.downloadVideoBuffer(
        'https://mock-assets.videoforge.ai/clips/sample-scene.mp4',
      );
      expect(result.buffer).toBeDefined();
      expect(result.contentType).toBe('video/mp4');
      expect(result.buffer.toString()).toContain('MOCK_MP4');
    });
  });
});

