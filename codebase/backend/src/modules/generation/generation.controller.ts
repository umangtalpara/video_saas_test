import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
import { GenerationQueueService } from './services/generation-queue.service';
import { ProjectsRepository } from '../projects/projects.repository';
import { SceneStatus } from '../projects/schemas/scene.schema';

@ApiTags('Generation')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GenerationController {
  constructor(
    private readonly queueService: GenerationQueueService,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  @Post(':id/generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Queue approved project scenes for video generation' })
  @ApiResponse({ status: 202, description: 'Generation accepted and queued' })
  public async generateProject(
    @Param('id') projectId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string; projectId: string; status: string }> {
    await this.queueService.startProjectGeneration(projectId, userId);
    return {
      message: 'Video generation queued successfully',
      projectId,
      status: 'queued',
    };
  }

  @Post(':id/scenes/:sceneId/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Retry generation for a failed scene' })
  @ApiResponse({ status: 202, description: 'Scene retry accepted' })
  public async retryScene(
    @Param('id') projectId: string,
    @Param('sceneId') sceneId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string; sceneId: string }> {
    await this.queueService.retryScene(projectId, sceneId, userId);
    return { message: 'Scene retry queued successfully', sceneId };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel ongoing video generation for project' })
  @ApiResponse({ status: 200, description: 'Generation cancelled' })
  public async cancelGeneration(
    @Param('id') projectId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string; projectId: string }> {
    await this.queueService.cancelProject(projectId, userId);
    return { message: 'Generation cancelled successfully', projectId };
  }

  @Get(':id/generation-status')
  @ApiOperation({ summary: 'Get live generation progress and scene statuses' })
  @ApiResponse({ status: 200, description: 'Generation status details' })
  public async getGenerationStatus(
    @Param('id') projectId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{
    projectId: string;
    status: string;
    progressPercent: number;
    scenesCount: number;
    completedScenes: number;
    failedScenes: number;
    scenes: Array<{
      id: string;
      sceneNumber: number;
      status: string;
      videoAssetUrl: string | null;
      errorMessage: string;
    }>;
  }> {
    const project = await this.projectsRepository.findByIdAndUser(projectId, userId);
    const scenes = await this.projectsRepository.findScenesForProject(projectId);

    const completed = scenes.filter((s) => s.status === SceneStatus.COMPLETED).length;
    const failed = scenes.filter((s) => s.status === SceneStatus.FAILED).length;
    const progressPercent =
      scenes.length > 0 ? Math.round((completed / scenes.length) * 100) : 0;

    return {
      projectId,
      status: project?.status || 'unknown',
      progressPercent,
      scenesCount: scenes.length,
      completedScenes: completed,
      failedScenes: failed,
      scenes: scenes.map((s) => ({
        id: s._id.toString(),
        sceneNumber: s.sceneNumber,
        status: s.status,
        videoAssetUrl: s.videoAssetUrl,
        errorMessage: s.errorMessage,
      })),
    };
  }
}

