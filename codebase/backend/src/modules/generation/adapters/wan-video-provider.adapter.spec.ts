import axios from 'axios';
import { WanVideoProviderAdapter } from './wan-video-provider.adapter';
import {
  ProviderAuthError,
  ProviderQuotaExhaustedError,
  ProviderRateLimitError,
} from './errors/provider-error';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WanVideoProviderAdapter', () => {
  let adapter: WanVideoProviderAdapter;
  let mockAxiosInstance: {
    get: jest.Mock;
    post: jest.Mock;
  };

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as unknown as ReturnType<typeof axios.create>);
    mockedAxios.isAxiosError.mockImplementation((payload: unknown) => {
      return Boolean(
        payload &&
          typeof payload === 'object' &&
          'isAxiosError' in payload &&
          (payload as { isAxiosError: boolean }).isAxiosError === true,
      );
    });

    adapter = new WanVideoProviderAdapter();
  });

  it('should have providerId wan', () => {
    expect(adapter.providerId).toBe('wan');
  });

  describe('validateCredentials', () => {
    it('should fail when API key is too short', async () => {
      const res = await adapter.validateCredentials({ apiKey: 'short' });
      expect(res.isValid).toBe(false);
      expect(res.message).toContain('too short');
    });

    it('should succeed when ping probe succeeds', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ status: 200, data: {} });

      const res = await adapter.validateCredentials({
        apiKey: 'sk-dashscope-valid-key-123456',
      });
      expect(res.isValid).toBe(true);
      expect(res.message).toContain('Alibaba Cloud Model Studio');
    });
  });

  describe('generateVideo', () => {
    it('should submit video generation task and return taskId', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          output: {
            task_id: 'wan-task-abc-123',
            task_status: 'PENDING',
          },
        },
      });

      const res = await adapter.generateVideo(
        { apiKey: 'sk-dashscope-valid-key-123456' },
        {
          modelId: 'wan2.1-t2v-turbo',
          prompt: 'A futuristic electric flying car flying over neo-Tokyo',
          aspectRatio: '16:9',
          durationSeconds: 5,
        },
        'idem-test-1',
      );

      expect(res.providerJobId).toBe('wan-task-abc-123');
      expect(res.status).toBe('queued');
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should map 401 error to ProviderAuthError', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 401, data: { message: 'Invalid Api-Key' } },
        message: 'Request failed with status code 401',
      };
      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(
        adapter.generateVideo(
          { apiKey: 'sk-invalid' },
          {
            modelId: 'wan2.1-t2v-turbo',
            prompt: 'Test prompt',
            aspectRatio: '16:9',
            durationSeconds: 5,
          },
          'idem-test-2',
        ),
      ).rejects.toThrow(ProviderAuthError);
    });

    it('should map 402 quota error to ProviderQuotaExhaustedError', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 402, data: { code: 'Arrearage', message: 'Account out of credits' } },
        message: 'Request failed with status code 402',
      };
      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(
        adapter.generateVideo(
          { apiKey: 'sk-test' },
          {
            modelId: 'wan2.1-t2v-turbo',
            prompt: 'Test prompt',
            aspectRatio: '16:9',
            durationSeconds: 5,
          },
          'idem-test-3',
        ),
      ).rejects.toThrow(ProviderQuotaExhaustedError);
    });

    it('should map 429 rate limit error to ProviderRateLimitError', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 429, data: { code: 'RateLimit', message: 'Too many requests' } },
        message: 'Request failed with status code 429',
      };
      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(
        adapter.generateVideo(
          { apiKey: 'sk-test' },
          {
            modelId: 'wan2.1-t2v-turbo',
            prompt: 'Test prompt',
            aspectRatio: '16:9',
            durationSeconds: 5,
          },
          'idem-test-4',
        ),
      ).rejects.toThrow(ProviderRateLimitError);
    });
  });

  describe('getGenerationStatus', () => {
    it('should return succeeded with videoUrl when SUCCEEDED', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          output: {
            task_id: 'task-123',
            task_status: 'SUCCEEDED',
            video_url: 'https://dashscope-result.oss.aliyuncs.com/video.mp4',
          },
        },
      });

      const res = await adapter.getGenerationStatus(
        { apiKey: 'sk-test' },
        'task-123',
      );

      expect(res.status).toBe('succeeded');
      expect(res.videoUrl).toBe('https://dashscope-result.oss.aliyuncs.com/video.mp4');
      expect(res.progressPercent).toBe(100);
    });

    it('should return failed when task_status is FAILED', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          output: {
            task_id: 'task-456',
            task_status: 'FAILED',
            code: 'ContentFilter',
            message: 'Violated content safety guidelines',
          },
        },
      });

      const res = await adapter.getGenerationStatus(
        { apiKey: 'sk-test' },
        'task-456',
      );

      expect(res.status).toBe('failed');
      expect(res.errorMessage).toContain('safety guidelines');
    });

    it('should return processing when task_status is RUNNING', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          output: {
            task_id: 'task-789',
            task_status: 'RUNNING',
          },
        },
      });

      const res = await adapter.getGenerationStatus(
        { apiKey: 'sk-test' },
        'task-789',
      );

      expect(res.status).toBe('processing');
      expect(res.progressPercent).toBe(50);
    });
  });
});
