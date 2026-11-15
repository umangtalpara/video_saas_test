import { UniversalAggregatorVideoAdapter } from './universal-aggregator-video.adapter';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UniversalAggregatorVideoAdapter', () => {
  let adapter: UniversalAggregatorVideoAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new UniversalAggregatorVideoAdapter().forProvider('piapi');
  });

  it('should be configured for piapi', () => {
    expect(adapter).toBeDefined();
    expect(adapter.providerId).toBe('piapi');
  });

  it('should validate credentials', async () => {
    const res = await adapter.validateCredentials({ apiKey: 'piapi-valid-token' });
    expect(res.isValid).toBe(true);
  });

  it('should submit task and poll status', async () => {
    const mockPost = jest.fn().mockResolvedValue({ data: { task_id: 'piapi-123' } });
    const mockGet = jest.fn().mockResolvedValue({
      data: { status: 'completed', video_url: 'https://cdn.piapi.ai/out.mp4' },
    });

    mockedAxios.create.mockReturnValue({
      post: mockPost,
      get: mockGet,
    } as unknown as ReturnType<typeof axios.create>);

    const res = await adapter.generateVideo(
      { apiKey: 'piapi-key' },
      {
        modelId: 'kling',
        prompt: 'Sunset on a tropical island',
        aspectRatio: '16:9',
        durationSeconds: 5,
      },
      'idemp-agg',
    );

    expect(res.providerJobId).toBe('piapi-123');

    const status = await adapter.getGenerationStatus({ apiKey: 'piapi-key' }, 'piapi-123');
    expect(status.status).toBe('succeeded');
    expect(status.videoUrl).toBe('https://cdn.piapi.ai/out.mp4');
  });
});

