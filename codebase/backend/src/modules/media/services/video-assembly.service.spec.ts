import { Types } from 'mongoose';
import { VideoAssemblyService } from './video-assembly.service';
import { ProjectsRepository } from '../../projects/projects.repository';
import { SafeDownloaderService } from '../../generation/services/safe-downloader.service';
import { FFmpegRendererService } from './ffmpeg-renderer.service';
import { SrtGeneratorService } from './srt-generator.service';
import { S3StorageService } from './s3-storage.service';
import { MediaRepository } from '../media.repository';
import { ProjectStatus, VideoProjectDocument } from '../../projects/schemas/project.schema';
import { SceneStatus } from '../../projects/schemas/scene.schema';

describe('VideoAssemblyService', () => {
  let service: VideoAssemblyService;
  let mockProjectsRepo: Partial<ProjectsRepository>;
  let mockSafeDownloader: Partial<SafeDownloaderService>;
  let mockFFmpegRenderer: Partial<FFmpegRendererService>;
  let mockSrtGenerator: Partial<SrtGeneratorService>;
  let mockS3Storage: Partial<S3StorageService>;
  let mockMediaRepo: Partial<MediaRepository>;

  const userId = new Types.ObjectId().toString();
  const projectId = new Types.ObjectId().toString();
  const sceneId = new Types.ObjectId().toString();

  const mockProject = {
    _id: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userId),
    title: 'Neon Odyssey',
    aspectRatio: '16:9',
    status: ProjectStatus.RENDERING,
  } as unknown as VideoProjectDocument;

  beforeEach(() => {
    mockProjectsRepo = {
      findScenesForProject: jest.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(sceneId),
          sceneNumber: 1,
          status: SceneStatus.COMPLETED,
          plannedDurationSeconds: 5,
          actualDurationSeconds: 5,
          videoAssetUrl: 'https://s3.aws/clip1.mp4',
          visualPrompt: 'Cyberpunk street',
          narration: 'The city never sleeps',
        },
      ]),
      updateByIdAndUser: jest.fn().mockResolvedValue(mockProject),
    };

    mockSafeDownloader = {
      downloadVideoBuffer: jest.fn().mockResolvedValue({
        buffer: Buffer.from('MOCK_CLIP_BUFFER'),
        contentType: 'video/mp4',
      }),
    };

    mockFFmpegRenderer = {
      concatenateClips: jest.fn().mockResolvedValue('/tmp/concat.mp4'),
      burnSubtitles: jest.fn().mockResolvedValue('/tmp/final.mp4'),
      extractThumbnail: jest.fn().mockResolvedValue('/tmp/thumb.jpg'),
    };

    mockSrtGenerator = {
      generateSrtContent: jest.fn().mockReturnValue('1\n00:00:00,000 --> 00:00:05,000\nThe city never sleeps'),
    };

    mockS3Storage = {
      buildFinalVideoKey: jest.fn().mockReturnValue(`users/${userId}/projects/${projectId}/final/render.mp4`),
      uploadBuffer: jest.fn().mockImplementation((key: string, buffer: Buffer) =>
        Promise.resolve({
          bucket: 'videoforge-assets',
          s3Key: key,
          publicUrl: `https://cdn.videoforge.ai/${key}`,
          fileSizeBytes: buffer.length,
        }),
      ),
    };

    mockMediaRepo = {
      create: jest.fn().mockResolvedValue({}),
    };

    service = new VideoAssemblyService(
      mockProjectsRepo as ProjectsRepository,
      mockSafeDownloader as SafeDownloaderService,
      mockFFmpegRenderer as FFmpegRendererService,
      mockSrtGenerator as SrtGeneratorService,
      mockS3Storage as S3StorageService,
      mockMediaRepo as MediaRepository,
    );
  });

  it('should assemble project and update status to COMPLETED', async () => {
    await service.assembleProject(mockProject);

    expect(mockProjectsRepo.findScenesForProject).toHaveBeenCalledWith(projectId);
    expect(mockFFmpegRenderer.concatenateClips).toHaveBeenCalled();
    expect(mockFFmpegRenderer.burnSubtitles).toHaveBeenCalled();
    expect(mockFFmpegRenderer.extractThumbnail).toHaveBeenCalled();
    expect(mockS3Storage.uploadBuffer).toHaveBeenCalledTimes(2);

    expect(mockProjectsRepo.updateByIdAndUser).toHaveBeenCalledWith(
      projectId,
      userId,
      expect.objectContaining({
        status: ProjectStatus.COMPLETED,
        finalVideoUrl: `https://cdn.videoforge.ai/users/${userId}/projects/${projectId}/final/render.mp4`,
      }),
    );
  });

  it('should mark project FAILED when 0 completed scenes exist', async () => {
    (mockProjectsRepo.findScenesForProject as jest.Mock).mockResolvedValueOnce([]);

    await service.assembleProject(mockProject);

    expect(mockProjectsRepo.updateByIdAndUser).toHaveBeenCalledWith(
      projectId,
      userId,
      expect.objectContaining({
        status: ProjectStatus.FAILED,
      }),
    );
  });
});

