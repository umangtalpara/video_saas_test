import { Injectable, Logger } from '@nestjs/common';
import { ProjectsRepository } from '../../projects/projects.repository';
import { ProviderAdapterRegistry } from '../adapters/provider-adapter.registry';
import { ProviderConnectionsService } from '../../provider-connections/provider-connections.service';
import { SafeDownloaderService } from './safe-downloader.service';
import { MediaInspectorService } from '../../media/services/media-inspector.service';
import { S3StorageService } from '../../media/services/s3-storage.service';
import { MediaRepository } from '../../media/media.repository';
import { AssetType } from '../../media/schemas/media-asset.schema';
import { VideoSceneDocument, SceneStatus } from '../../projects/schemas/scene.schema';
import { VideoProjectDocument, ProjectStatus } from '../../projects/schemas/project.schema';
import { DecryptedCredentials } from '../adapters/interfaces/video-provider-adapter.interface';

@Injectable()
export class SceneProcessorService {
  private readonly logger = new Logger(SceneProcessorService.name);

  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly adapterRegistry: ProviderAdapterRegistry,
    private readonly providerConnectionsService: ProviderConnectionsService,
    private readonly safeDownloader: SafeDownloaderService,
    private readonly mediaInspector: MediaInspectorService,
    private readonly s3Storage: S3StorageService,
    private readonly mediaRepository: MediaRepository,
  ) {}

  public async getCredentials(project: VideoProjectDocument): Promise<DecryptedCredentials> {
    const providerId = project.providerId || 'mock';
    if (providerId === 'mock') {
      return { apiKey: 'mock-valid-key' };
    }
    if (!project.providerConnectionId) {
      throw new Error(`Project ${project._id} has no providerConnectionId configured`);
    }
    return this.providerConnectionsService.getDecryptedCredentials(
      project.providerConnectionId.toString(),
      project.userId.toString(),
    );
  }

  public async pollUntilComplete(
    adapter: ReturnType<ProviderAdapterRegistry['getAdapter']>,
    credentials: DecryptedCredentials,
    jobId: string,
    maxWaitSec: number = 300,
  ): Promise<string> {
    const deadline = Date.now() + maxWaitSec * 1000;
    let delayMs = 1500;

    while (Date.now() < deadline) {
      const status = await adapter.getGenerationStatus(credentials, jobId);
      if (status.status === 'succeeded' && status.videoUrl) {
        return status.videoUrl;
      }
      if (status.status === 'failed') {
        throw new Error(status.errorMessage || status.errorCode || 'Remote generation failed');
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 1.5, 10000);
    }
    throw new Error(`Generation timed out after ${maxWaitSec}s`);
  }

  public async executeScene(
    scene: VideoSceneDocument,
    project: VideoProjectDocument,
  ): Promise<void> {
    const sceneId = scene._id.toString();
    const projectId = project._id.toString();
    const userId = project.userId.toString();
    const providerId = scene.providerId || project.providerId || 'mock';

    try {
      const credentials = await this.getCredentials(project);
      const adapter = this.adapterRegistry.getAdapter(providerId);

      const accepted = await adapter.generateVideo(
        credentials,
        {
          modelId: scene.modelId || project.modelId,
          prompt: scene.visualPrompt,
          negativePrompt: scene.negativePrompt,
          aspectRatio: project.aspectRatio || '16:9',
          durationSeconds: scene.plannedDurationSeconds || 5,
        },
        `scene-${sceneId}-${Date.now()}`,
      );

      await this.projectsRepository.updateScene(sceneId, projectId, userId, {
        providerJobId: accepted.providerJobId,
        status: SceneStatus.GENERATING,
      });

      const remoteVideoUrl = await this.pollUntilComplete(
        adapter,
        credentials,
        accepted.providerJobId,
      );

      // Download safely with SSRF protection
      const { buffer, contentType } = await this.safeDownloader.downloadVideoBuffer(remoteVideoUrl);
      const mediaInfo = this.mediaInspector.inspectVideoBuffer(
        buffer,
        scene.plannedDurationSeconds,
      );

      // Upload to S3 with tenant isolation
      const s3Result = await this.s3Storage.uploadSceneClip(
        userId,
        projectId,
        sceneId,
        buffer,
        contentType,
      );

      // Record MediaAsset
      await this.mediaRepository.create({
        userId: project.userId,
        projectId: project._id,
        sceneId: scene._id,
        assetType: AssetType.SCENE_CLIP,
        s3Bucket: s3Result.bucket,
        s3Key: s3Result.s3Key,
        publicUrl: s3Result.publicUrl,
        fileSizeBytes: s3Result.fileSizeBytes,
        mimeType: contentType,
        durationSeconds: mediaInfo.durationSeconds,
        resolution: mediaInfo.resolution,
        codec: mediaInfo.codec,
      });

      // Update Scene to COMPLETED
      await this.projectsRepository.updateScene(sceneId, projectId, userId, {
        status: SceneStatus.COMPLETED,
        videoAssetUrl: s3Result.publicUrl,
        actualDurationSeconds: mediaInfo.durationSeconds,
        resolution: mediaInfo.resolution,
      });

      await this.checkProjectCompletion(project);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown generation error';
      this.logger.error(`Scene ${sceneId} generation failed: ${msg}`);
      await this.projectsRepository.updateScene(sceneId, projectId, userId, {
        status: SceneStatus.FAILED,
        errorMessage: msg,
      });
      await this.projectsRepository.updateByIdAndUser(projectId, userId, {
        status: ProjectStatus.FAILED,
        errorMessage: `Scene ${scene.sceneNumber} failed: ${msg}`,
      });
    }
  }

  public async checkProjectCompletion(project: VideoProjectDocument): Promise<void> {
    const projectId = project._id.toString();
    const userId = project.userId.toString();
    const scenes = await this.projectsRepository.findScenesForProject(projectId);
    const allCompleted = scenes.length > 0 && scenes.every((s) => s.status === SceneStatus.COMPLETED);

    if (allCompleted) {
      this.logger.log(`All scenes completed for project ${projectId}. Transitioning to RENDERING`);
      await this.projectsRepository.updateByIdAndUser(projectId, userId, {
        status: ProjectStatus.RENDERING,
      });
    }
  }
}
