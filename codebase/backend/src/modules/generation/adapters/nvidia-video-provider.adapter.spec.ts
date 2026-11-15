import { NvidiaVideoProviderAdapter } from './nvidia-video-provider.adapter';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NvidiaVideoProviderAdapter', () => {
  let adapter: NvidiaVideoProviderAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new NvidiaVideoProviderAdapter();
  });

  it('should be defined with providerId nvidia-cosmos', () => {
    expect(adapter).toBeDefined();
    expect(adapter.providerId).toBe('nvidia-cosmos');
  });

  it('should validate valid credentials', async () => {
    const res = await adapter.validateCredentials({ apiKey: 'nvapi-valid-token-12345' });
    expect(res.isValid).toBe(true);
    expect(res.message).toContain('NVIDIA Cosmos');
  });

  it('should reject invalid short credentials', async () => {
    const res = await adapter.validateCredentials({ apiKey: 'short' });
    expect(res.isValid).toBe(false);
  });

  it('should generate video job', async () => {
    const mockPost = jest.fn().mockResolvedValue({ data: { id: 'nv-test-job-1' } });
    mockedAxios.create.mockReturnValue({ post: mockPost } as unknown as ReturnType<typeof axios.create>);

    const res = await adapter.generateVideo(
      { apiKey: 'nvapi-valid-token' },
      {
        modelId: 'cosmos-3-nano',
        prompt: 'Futuristic city race',
        aspectRatio: '16:9',
        durationSeconds: 5,
      },
      'idemp-1',
    );

    expect(res.providerJobId).toBe('nv-test-job-1');
    expect(res.status).toBe('queued');
  });

  it('should poll job status until completed', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      data: { status: 'completed', video_url: 'https://cdn.nvidia.com/video.mp4' },
    });
    mockedAxios.create.mockReturnValue({ get: mockGet } as unknown as ReturnType<typeof axios.create>);

    const status = await adapter.getGenerationStatus({ apiKey: 'nvapi-valid-token' }, 'nv-test-job-1');
    expect(status.status).toBe('succeeded');
    expect(status.videoUrl).toBe('https://cdn.nvidia.com/video.mp4');
  });
});

