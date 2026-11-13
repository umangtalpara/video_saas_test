import { MockVideoProviderAdapter } from './mock-video-provider.adapter';
import { ProviderAuthError } from './errors/provider-error';

describe('MockVideoProviderAdapter', () => {
  let adapter: MockVideoProviderAdapter;

  beforeEach(() => {
    adapter = new MockVideoProviderAdapter();
  });

  it('should have providerId mock', () => {
    expect(adapter.providerId).toBe('mock');
  });

  describe('validateCredentials', () => {
    it('should validate valid mock credentials', async () => {
      const res = await adapter.validateCredentials({ apiKey: 'mock-key-12345' });
      expect(res.isValid).toBe(true);
      expect(res.message).toContain('verified');
    });

    it('should reject invalid mock credentials', async () => {
      await expect(
        adapter.validateCredentials({ apiKey: 'invalid-key' }),
      ).rejects.toThrow(ProviderAuthError);
    });
  });

  describe('generateVideo', () => {
    it('should return accepted job for standard prompt', async () => {
      const res = await adapter.generateVideo(
        { apiKey: 'mock-key' },
        {
          modelId: 'mock-model',
          prompt: 'A golden retriever playing in autumn leaves',
          aspectRatio: '16:9',
          durationSeconds: 5,
        },
        'idem-key-1',
      );

      expect(res.status).toBe('queued');
      expect(res.providerJobId).toBeDefined();
      expect(res.providerJobId).not.toContain('fail');
    });

    it('should return fail job id if prompt requests failure', async () => {
      const res = await adapter.generateVideo(
        { apiKey: 'mock-key' },
        {
          modelId: 'mock-model',
          prompt: 'This should fail gracefully',
          aspectRatio: '16:9',
          durationSeconds: 5,
        },
        'idem-key-2',
      );

      expect(res.providerJobId).toContain('mock-fail-');
    });
  });

  describe('getGenerationStatus', () => {
    it('should return succeeded status and videoUrl for standard job', async () => {
      const status = await adapter.getGenerationStatus(
        { apiKey: 'mock-key' },
        'mock-job-123',
      );

      expect(status.status).toBe('succeeded');
      expect(status.videoUrl).toContain('.mp4');
      expect(status.progressPercent).toBe(100);
    });

    it('should return failed status for fail-marked job', async () => {
      const status = await adapter.getGenerationStatus(
        { apiKey: 'mock-key' },
        'mock-fail-123',
      );

      expect(status.status).toBe('failed');
      expect(status.errorCode).toBe('MOCK_INDUCED_FAILURE');
    });
  });

  describe('cancelJob', () => {
    it('should return true', async () => {
      const res = await adapter.cancelJob({ apiKey: 'mock' }, 'job-123');
      expect(res).toBe(true);
    });
  });
});

