import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectsRepository } from '../projects/projects.repository';
import { S3StorageService } from './services/s3-storage.service';
import { MediaRepository } from './media.repository';
import { AssetType, MediaAssetDocument } from './schemas/media-asset.schema';

@ApiTags('Media')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MediaController {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly s3Storage: S3StorageService,
    private readonly mediaRepository: MediaRepository,
  ) {}

  @Get(':id/download-url')
  @ApiOperation({ summary: 'Generate presigned expiring download URL for rendered video' })
  @ApiResponse({ status: 200, description: 'Presigned download URL' })
  public async getDownloadUrl(
    @Param('id') projectId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ downloadUrl: string; expiresInSeconds: number; fileName: string }> {
    const project = await this.projectsRepository.findByIdAndUser(projectId, userId);
    if (!project) throw new NotFoundException('Project not found');

    const s3Key = this.s3Storage.buildFinalVideoKey(userId, projectId);
    const sanitizedTitle = project.title
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    const fileName = `${sanitizedTitle || 'videoforge_render'}.mp4`;

    const expiresInSeconds = 3600; // 1 hour
    const downloadUrl = await this.s3Storage.generatePresignedGetUrl(
      s3Key,
      expiresInSeconds,
      fileName,
    );

    return {
      downloadUrl,
      expiresInSeconds,
      fileName,
    };
  }

  @Get(':id/preview-url')
  @ApiOperation({ summary: 'Generate presigned expiring preview URL for project video and thumbnail' })
  @ApiResponse({ status: 200, description: 'Presigned preview URLs' })
  public async getPreviewUrl(
    @Param('id') projectId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{
    previewUrl: string | null;
    thumbnailUrl: string | null;
    expiresInSeconds: number;
  }> {
    const project = await this.projectsRepository.findByIdAndUser(projectId, userId);
    if (!project) throw new NotFoundException('Project not found');

    const expiresInSeconds = 7200; // 2 hours
    const videoKey = this.s3Storage.buildFinalVideoKey(userId, projectId);
    const thumbKey = `users/${userId}/projects/${projectId}/final/thumbnail.jpg`;

    const previewUrl = project.finalVideoUrl
      ? await this.s3Storage.generatePresignedGetUrl(videoKey, expiresInSeconds)
      : null;

    const thumbnailUrl = project.thumbnailUrl
      ? await this.s3Storage.generatePresignedGetUrl(thumbKey, expiresInSeconds)
      : null;

    return {
      previewUrl,
      thumbnailUrl,
      expiresInSeconds,
    };
  }

  @Get(':id/assets')
  @ApiOperation({ summary: 'List all stored media assets for project' })
  @ApiResponse({ status: 200, description: 'List of media assets' })
  public async getProjectAssets(
    @Param('id') projectId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<MediaAssetDocument[]> {
    const project = await this.projectsRepository.findByIdAndUser(projectId, userId);
    if (!project) throw new NotFoundException('Project not found');

    return this.mediaRepository.findByProject(projectId, userId);
  }
}

