import { HuggingFaceVideoProviderAdapter } from './huggingface-video-provider.adapter';
import { S3StorageService } from '../../media/services/s3-storage.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HuggingFaceVideoProviderAdapter', () => {
  let adapter: HuggingFaceVideoProviderAdapter;
  const mockS3Service = {
    uploadBuffer: jest.fn().mockResolvedValue({
      publicUrl: 'https://jaguai.s3.amazonaws.com/hf-video.mp4',
    }),
  } as unknown as S3StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new HuggingFaceVideoProviderAdapter(mockS3Service);
  });

  it('should be defined with providerId huggingface', () => {
    expect(adapter).toBeDefined();
    expect(adapter.providerId).toBe('huggingface');
  });

  it('should validate valid Hugging Face API token starting with hf_', async () => {
    const res = await adapter.validateCredentials({ apiKey: 'hf_validtoken12345678' });
    expect(res.isValid).toBe(true);
  });

  it('should reject invalid Hugging Face token', async () => {
    const res = await adapter.validateCredentials({ apiKey: 'invalid-token' });
    expect(res.isValid).toBe(false);
  });

  it('should stream video bytes and upload to S3', async () => {
    const fakeBuffer = Buffer.from('fake mp4 video bytes');
    const mockPost = jest.fn().mockResolvedValue({ data: fakeBuffer });
    mockedAxios.create.mockReturnValue({ post: mockPost } as unknown as ReturnType<typeof axios.create>);

    const res = await adapter.generateVideo(
      { apiKey: 'hf_token123' },
      {
        modelId: 'damo-vilab/text-to-video-ms-1.7b',
        prompt: 'A red sports car racing down highway',
        aspectRatio: '16:9',
        durationSeconds: 4,
      },
      'idemp-hf-1',
    );

    expect(res.providerJobId).toBeDefined();
    expect(mockS3Service.uploadBuffer).toHaveBeenCalled();

    const status = await adapter.getGenerationStatus({ apiKey: 'hf_token123' }, res.providerJobId);
    expect(status.status).toBe('succeeded');
    expect(status.videoUrl).toBe('https://jaguai.s3.amazonaws.com/hf-video.mp4');
  });
});

