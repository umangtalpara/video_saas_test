import { MiniMaxVideoProviderAdapter } from './minimax-video-provider.adapter';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MiniMaxVideoProviderAdapter', () => {
  let adapter: MiniMaxVideoProviderAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new MiniMaxVideoProviderAdapter();
  });

  it('should be defined with providerId minimax-hailuo', () => {
    expect(adapter).toBeDefined();
    expect(adapter.providerId).toBe('minimax-hailuo');
  });

  it('should generate video job', async () => {
    const mockPost = jest.fn().mockResolvedValue({
      data: { task_id: 'minimax-task-1', base_resp: { status_code: 0 } },
    });
    mockedAxios.create.mockReturnValue({ post: mockPost } as unknown as ReturnType<typeof axios.create>);

    const res = await adapter.generateVideo(
      { apiKey: 'minimax-valid-api-key' },
      {
        modelId: 'video-01',
        prompt: 'Cute puppy running in meadow',
        aspectRatio: '16:9',
        durationSeconds: 6,
      },
      'idemp-minimax',
    );

    expect(res.providerJobId).toBe('minimax-task-1');
  });

  it('should poll job status and return video URL', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      data: {
        status: 'success',
        download_url: 'https://cdn.minimax.chat/video/task-1.mp4',
      },
    });
    mockedAxios.create.mockReturnValue({ get: mockGet } as unknown as ReturnType<typeof axios.create>);

    const status = await adapter.getGenerationStatus({ apiKey: 'minimax-valid-api-key' }, 'minimax-task-1');
    expect(status.status).toBe('succeeded');
    expect(status.videoUrl).toBe('https://cdn.minimax.chat/video/task-1.mp4');
  });
});

