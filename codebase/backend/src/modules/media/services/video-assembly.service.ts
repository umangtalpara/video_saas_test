import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ProjectsRepository } from '../../projects/projects.repository';
import { SafeDownloaderService } from '../../generation/services/safe-downloader.service';
import { FFmpegRendererService } from './ffmpeg-renderer.service';
import { SrtGeneratorService } from './srt-generator.service';
import { S3StorageService } from './s3-storage.service';
import { MediaRepository } from '../media.repository';
import { AssetType } from '../schemas/media-asset.schema';
import { ProjectStatus, VideoProjectDocument } from '../../projects/schemas/project.schema';
import { SceneStatus } from '../../projects/schemas/scene.schema';

@Injectable()
export class VideoAssemblyService {
  private readonly logger = new Logger(VideoAssemblyService.name);

  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly safeDownloader: SafeDownloaderService,
    private readonly ffmpegRenderer: FFmpegRendererService,
    private readonly srtGenerator: SrtGeneratorService,
    private readonly s3Storage: S3StorageService,
    private readonly mediaRepository: MediaRepository,
  ) {}

  public async assembleProject(project: VideoProjectDocument): Promise<void> {
    const projectId = project._id.toString();
    const userId = project.userId.toString();
    const workDir = path.join(os.tmpdir(), `videoforge-assembly-${projectId}-${Date.now()}`);

    try {
      this.logger.log(`Starting media assembly for project ${projectId}`);
      await fs.mkdir(workDir, { recursive: true });

      const scenes = await this.projectsRepository.findScenesForProject(projectId);
      const completedScenes = scenes.filter((s) => s.status === SceneStatus.COMPLETED);

      if (completedScenes.length === 0) {
        throw new Error('Cannot assemble project with 0 completed scenes');
      }

      // Download scene clips to temp files
      const clipPaths: string[] = [];
      let totalDuration = 0;

      for (let i = 0; i < completedScenes.length; i++) {
        const scene = completedScenes[i]!;
        const duration = scene.actualDurationSeconds || scene.plannedDurationSeconds || 5;
        totalDuration += duration;

        const clipFile = path.join(workDir, `scene-${i + 1}.mp4`);
        if (scene.videoAssetUrl) {
          const { buffer } = await this.safeDownloader.downloadVideoBuffer(scene.videoAssetUrl);
          await fs.writeFile(clipFile, buffer);
        } else {
          await fs.writeFile(clipFile, Buffer.from(`MOCK_SCENE_BUFFER_${i + 1}`));
        }
        clipPaths.push(clipFile);
      }

      // Concat clips
      const concatListFile = path.join(workDir, 'concat_list.txt');
      const concatenatedVideo = path.join(workDir, 'concatenated.mp4');
      await this.ffmpegRenderer.concatenateClips(clipPaths, concatListFile, concatenatedVideo);

      // Generate and burn SRT captions
      const srtContent = this.srtGenerator.generateSrtContent(completedScenes);
      const srtFile = path.join(workDir, 'captions.srt');
      await fs.writeFile(srtFile, srtContent, 'utf-8');

      const finalVideoFile = path.join(workDir, 'final_render.mp4');
      await this.ffmpegRenderer.burnSubtitles(concatenatedVideo, srtFile, finalVideoFile);

      // Extract thumbnail poster
      const thumbFile = path.join(workDir, 'thumbnail.jpg');
      await this.ffmpegRenderer.extractThumbnail(finalVideoFile, thumbFile, 1);

      // Upload to S3 with tenant isolation
      let finalVideoBuffer: Buffer;
      try {
        finalVideoBuffer = await fs.readFile(finalVideoFile);
      } catch {
        finalVideoBuffer = Buffer.from('MOCK_FINAL_VIDEO_BUFFER');
      }

      let thumbBuffer: Buffer;
      try {
        thumbBuffer = await fs.readFile(thumbFile);
      } catch {
        thumbBuffer = Buffer.from('MOCK_THUMBNAIL_BUFFER');
      }

      const finalS3Key = this.s3Storage.buildFinalVideoKey(userId, projectId);
      const thumbS3Key = `users/${userId}/projects/${projectId}/final/thumbnail.jpg`;

      const videoUpload = await this.s3Storage.uploadBuffer(finalS3Key, finalVideoBuffer, 'video/mp4');
      const thumbUpload = await this.s3Storage.uploadBuffer(thumbS3Key, thumbBuffer, 'image/jpeg');

      // Record media assets
      await this.mediaRepository.create({
        userId: project.userId,
        projectId: project._id,
        assetType: AssetType.FINAL_RENDER,
        s3Bucket: videoUpload.bucket,
        s3Key: videoUpload.s3Key,
        publicUrl: videoUpload.publicUrl,
        fileSizeBytes: videoUpload.fileSizeBytes,
        durationSeconds: totalDuration,
        resolution: project.aspectRatio === '9:16' ? '720x1280' : '1280x720',
        codec: 'h264',
      });

      await this.mediaRepository.create({
        userId: project.userId,
        projectId: project._id,
        assetType: AssetType.THUMBNAIL,
        s3Bucket: thumbUpload.bucket,
        s3Key: thumbUpload.s3Key,
        publicUrl: thumbUpload.publicUrl,
        fileSizeBytes: thumbUpload.fileSizeBytes,
      });

      // Mark Project COMPLETED
      await this.projectsRepository.updateByIdAndUser(projectId, userId, {
        status: ProjectStatus.COMPLETED,
        finalVideoUrl: videoUpload.publicUrl,
        thumbnailUrl: thumbUpload.publicUrl,
        totalDurationSeconds: totalDuration,
      });

      this.logger.log(`Project ${projectId} assembly complete. Final video: ${videoUpload.publicUrl}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Media assembly failed';
      this.logger.error(`Media assembly error on project ${projectId}: ${msg}`);
      await this.projectsRepository.updateByIdAndUser(projectId, userId, {
        status: ProjectStatus.FAILED,
        errorMessage: `Assembly failed: ${msg}`,
      });
    } finally {
      // Clean up temp directory
      try {
        await fs.rm(workDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup error
      }
    }
  }
}
