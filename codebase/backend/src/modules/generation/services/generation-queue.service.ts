import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ProjectsRepository } from '../../projects/projects.repository';
import { SceneProcessorService } from './scene-processor.service';
import { ProjectStatus } from '../../projects/schemas/project.schema';
import { SceneStatus } from '../../projects/schemas/scene.schema';

const MAX_CONCURRENT_SCENES = 2;

@Injectable()
export class GenerationQueueService {
  private readonly logger = new Logger(GenerationQueueService.name);
  private readonly activeSceneIds = new Set<string>();
  private isProcessingTick = false;

  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly sceneProcessor: SceneProcessorService,
  ) { }

  public getQueueStats(): { activeCount: number; maxConcurrency: number } {
    return {
      activeCount: this.activeSceneIds.size,
      maxConcurrency: MAX_CONCURRENT_SCENES,
    };
  }

  public async startProjectGeneration(projectId: string, userId: string): Promise<void> {
    const project = await this.projectsRepository.findByIdAndUser(projectId, userId);
    if (!project) throw new NotFoundException('Project not found');

    const scenes = await this.projectsRepository.findScenesForProject(projectId);
    if (scenes.length === 0) {
      throw new BadRequestException('Project has no scenes to generate');
    }

    await this.projectsRepository.updateByIdAndUser(projectId, userId, {
      status: ProjectStatus.QUEUED,
      errorMessage: '',
    });

    for (const scene of scenes) {
      if (scene.status !== SceneStatus.COMPLETED) {
        await this.projectsRepository.updateScene(
          scene._id.toString(),
          projectId,
          userId,
          { status: SceneStatus.QUEUED, errorMessage: '' },
        );
      }
    }

    this.logger.log(`Project ${projectId} queued for video generation with ${scenes.length} scenes`);
    setImmediate(() => this.processQueueTick());
  }

  public async retryScene(projectId: string, sceneId: string, userId: string): Promise<void> {
    const project = await this.projectsRepository.findByIdAndUser(projectId, userId);
    if (!project) throw new NotFoundException('Project not found');

    const scenes = await this.projectsRepository.findScenesForProject(projectId);
    const scene = scenes.find((s) => s._id.toString() === sceneId);
    if (!scene) throw new NotFoundException('Scene not found in project');

    await this.projectsRepository.updateScene(sceneId, projectId, userId, {
      status: SceneStatus.QUEUED,
      errorMessage: '',
    });

    if (project.status === ProjectStatus.FAILED) {
      await this.projectsRepository.updateByIdAndUser(projectId, userId, {
        status: ProjectStatus.GENERATING,
        errorMessage: '',
      });
    }

    setImmediate(() => this.processQueueTick());
  }

  public async cancelProject(projectId: string, userId: string): Promise<void> {
    const project = await this.projectsRepository.findByIdAndUser(projectId, userId);
    if (!project) throw new NotFoundException('Project not found');

    const scenes = await this.projectsRepository.findScenesForProject(projectId);
    for (const scene of scenes) {
      if (scene.status === SceneStatus.QUEUED) {
        await this.projectsRepository.updateScene(
          scene._id.toString(),
          projectId,
          userId,
          { status: SceneStatus.DRAFT },
        );
      }
    }

    await this.projectsRepository.updateByIdAndUser(projectId, userId, {
      status: ProjectStatus.FAILED,
      errorMessage: 'Generation cancelled by user',
    });
  }

  @Interval(3000)
  public async handleInterval(): Promise<void> {
    await this.processQueueTick();
  }

  public async processQueueTick(): Promise<void> {
    if (this.isProcessingTick) return;
    this.isProcessingTick = true;

    try {
      if (this.activeSceneIds.size >= MAX_CONCURRENT_SCENES) return;

      // Find projects currently QUEUED or GENERATING
      const targetProjects = await this.projectsRepository.findProjectsByStatuses([
        ProjectStatus.QUEUED,
        ProjectStatus.GENERATING,
      ]);

      for (const project of targetProjects) {
        if (this.activeSceneIds.size >= MAX_CONCURRENT_SCENES) break;

        const projectId = project._id.toString();
        const scenes = await this.projectsRepository.findScenesForProject(projectId);
        const nextScene = scenes.find(
          (s) => s.status === SceneStatus.QUEUED && !this.activeSceneIds.has(s._id.toString()),
        );

        if (nextScene) {
          const sceneId = nextScene._id.toString();
          this.activeSceneIds.add(sceneId);

          if (project.status === ProjectStatus.QUEUED) {
            await this.projectsRepository.updateByIdAndUser(projectId, project.userId.toString(), {
              status: ProjectStatus.GENERATING,
            });
          }

          // Execute scene asynchronously
          this.sceneProcessor
            .executeScene(nextScene, project)
            .finally(() => {
              this.activeSceneIds.delete(sceneId);
              setImmediate(() => this.processQueueTick());
            });
        }
      }
    } catch (err: unknown) {
      this.logger.error(`Error in generation queue tick: ${err}`);
    } finally {
      this.isProcessingTick = false;
    }
  }
}