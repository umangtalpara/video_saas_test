import { Types } from 'mongoose';
import { SceneProcessorService } from './scene-processor.service';
import { ProjectsRepository } from '../../projects/projects.repository';
import { ProviderAdapterRegistry } from '../adapters/provider-adapter.registry';
import { ProviderConnectionsService } from '../../provider-connections/provider-connections.service';
import { SafeDownloaderService } from './safe-downloader.service';
import { MediaInspectorService } from '../../media/services/media-inspector.service';
import { S3StorageService } from '../../media/services/s3-storage.service';
import { MediaRepository } from '../../media/media.repository';
import { VideoAssemblyService } from '../../media/services/video-assembly.service';
import { ProjectStatus, VideoProjectDocument } from '../../projects/schemas/project.schema';
import { SceneStatus, VideoSceneDocument } from '../../projects/schemas/scene.schema';

describe('SceneProcessorService', () => {
  let service: SceneProcessorService;
  let mockProjectsRepo: Partial<ProjectsRepository>;
  let mockAdapterRegistry: Partial<ProviderAdapterRegistry>;
  let mockConnectionsService: Partial<ProviderConnectionsService>;
  let mockSafeDownloader: Partial<SafeDownloaderService>;
  let mockMediaInspector: Partial<MediaInspectorService>;
  let mockS3Storage: Partial<S3StorageService>;
  let mockMediaRepo: Partial<MediaRepository>;
  let mockVideoAssembly: Partial<VideoAssemblyService>;

  const userId = new Types.ObjectId().toString();
  const projectId = new Types.ObjectId().toString();
  const sceneId = new Types.ObjectId().toString();

  const mockProject = {
    _id: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userId),
    providerId: 'mock',
    modelId: 'mock-model',
  } as unknown as VideoProjectDocument;

  const mockScene = {
    _id: new Types.ObjectId(sceneId),
    sceneNumber: 1,
    visualPrompt: 'Drone through sunset',
    plannedDurationSeconds: 5,
  } as unknown as VideoSceneDocument;

  beforeEach(() => {
    mockProjectsRepo = {
      updateScene: jest.fn().mockResolvedValue(mockScene),
      updateByIdAndUser: jest.fn().mockResolvedValue(mockProject),
      findScenesForProject: jest.fn().mockResolvedValue([
        { ...mockScene, status: SceneStatus.COMPLETED },
      ]),
    };

    mockAdapterRegistry = {
      getAdapter: jest.fn().mockReturnValue({
        generateVideo: jest.fn().mockResolvedValue({ providerJobId: 'job-1' }),
        getGenerationStatus: jest.fn().mockResolvedValue({
          status: 'succeeded',
          videoUrl: 'https://s3.aws/mock.mp4',
        }),
      }),
    };

    mockConnectionsService = {
      getDecryptedCredentials: jest.fn().mockResolvedValue({ apiKey: 'test' }),
    };

    mockSafeDownloader = {
      downloadVideoBuffer: jest.fn().mockResolvedValue({
        buffer: Buffer.from('CLIP_DATA'),
        contentType: 'video/mp4',
      }),
    };

    mockMediaInspector = {
      inspectVideoBuffer: jest.fn().mockReturnValue({
        isValid: true,
        durationSeconds: 5,
        resolution: '1280x720',
        codec: 'h264',
      }),
    };

    mockS3Storage = {
      uploadSceneClip: jest.fn().mockResolvedValue({
        bucket: 'b',
        s3Key: 'k',
        publicUrl: 'https://cdn.videoforge.ai/clip.mp4',
        fileSizeBytes: 100,
      }),
    };

    mockMediaRepo = {
      create: jest.fn().mockResolvedValue({}),
    };

    mockVideoAssembly = {
      assembleProject: jest.fn().mockResolvedValue(undefined),
    };

    service = new SceneProcessorService(
      mockProjectsRepo as ProjectsRepository,
      mockAdapterRegistry as ProviderAdapterRegistry,
      mockConnectionsService as ProviderConnectionsService,
      mockSafeDownloader as SafeDownloaderService,
      mockMediaInspector as MediaInspectorService,
      mockS3Storage as S3StorageService,
      mockMediaRepo as MediaRepository,
      mockVideoAssembly as VideoAssemblyService,
    );
  });

  it('should execute scene and trigger assembly when all scenes completed', async () => {
    await service.executeScene(mockScene, mockProject);

    expect(mockProjectsRepo.updateScene).toHaveBeenCalledWith(
      sceneId,
      projectId,
      userId,
      expect.objectContaining({ status: SceneStatus.COMPLETED }),
    );

    expect(mockVideoAssembly.assembleProject).toHaveBeenCalled();
  });
});
