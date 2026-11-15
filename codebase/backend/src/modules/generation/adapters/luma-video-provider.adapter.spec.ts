import { LumaVideoProviderAdapter } from './luma-video-provider.adapter';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LumaVideoProviderAdapter', () => {
  let adapter: LumaVideoProviderAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new LumaVideoProviderAdapter();
  });

  it('should be defined with providerId luma-ai', () => {
    expect(adapter).toBeDefined();
    expect(adapter.providerId).toBe('luma-ai');
  });

  it('should validate valid Luma credentials', async () => {
    const res = await adapter.validateCredentials({ apiKey: 'luma-secret-key-123' });
    expect(res.isValid).toBe(true);
  });

  it('should generate video job', async () => {
    const mockPost = jest.fn().mockResolvedValue({ data: { id: 'luma-job-abc' } });
    mockedAxios.create.mockReturnValue({ post: mockPost } as unknown as ReturnType<typeof axios.create>);

    const res = await adapter.generateVideo(
      { apiKey: 'luma-key' },
      {
        modelId: 'ray-2',
        prompt: 'Ocean wave splashing on rocks',
        aspectRatio: '16:9',
        durationSeconds: 5,
      },
      'idemp-luma',
    );

    expect(res.providerJobId).toBe('luma-job-abc');
  });

  it('should poll job status and return video URL when completed', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      data: {
        state: 'completed',
        assets: { video: 'https://lumalabs.ai/renders/output.mp4' },
      },
    });
    mockedAxios.create.mockReturnValue({ get: mockGet } as unknown as ReturnType<typeof axios.create>);

    const status = await adapter.getGenerationStatus({ apiKey: 'luma-key' }, 'luma-job-abc');
    expect(status.status).toBe('succeeded');
    expect(status.videoUrl).toBe('https://lumalabs.ai/renders/output.mp4');
  });
});

