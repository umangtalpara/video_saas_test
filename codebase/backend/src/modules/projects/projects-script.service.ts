import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectsRepository } from './projects.repository';
import { ScriptPlannerService } from './script-planner.service';
import { ProjectStatus } from './schemas/project.schema';
import { SceneStatus, VideoScene } from './schemas/scene.schema';
import { GenerateScriptDto } from './dto/generate-script.dto';
import { UpdateScriptDto } from './dto/update-script.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { SceneResponseDto } from './dto/scene-response.dto';
import { validateProjectTransition } from './project-state-machine';

@Injectable()
export class ProjectsScriptService {
  constructor(
    private readonly repository: ProjectsRepository,
    private readonly scriptPlannerService: ScriptPlannerService,
  ) {}

  public async generateScript(
    id: string,
    userId: string,
    dto: GenerateScriptDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.repository.findByIdAndUser(id, userId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    validateProjectTransition(project.status, ProjectStatus.SCRIPT_GENERATING);

    // Transition to generating
    await this.repository.updateByIdAndUser(id, userId, {
      status: ProjectStatus.SCRIPT_GENERATING,
    });

    const plannedScenes = this.scriptPlannerService.planScenes(
      project,
      dto.additionalInstructions,
    );

    const sceneDocs: Partial<VideoScene>[] = plannedScenes.map((s) => ({
      projectId: project._id,
      userId: project.userId,
      sceneNumber: s.sceneNumber,
      narration: s.narration,
      visualPrompt: s.visualPrompt,
      negativePrompt: s.negativePrompt,
      plannedDurationSeconds: s.plannedDurationSeconds,
      providerId: s.providerId,
      modelId: s.modelId,
      generationMode: s.generationMode,
      continuityNotes: s.continuityNotes,
      transition: s.transition,
      status: SceneStatus.DRAFT,
    }));

    await this.repository.replaceScenesForProject(id, sceneDocs);

    const totalDurationSeconds = plannedScenes.reduce(
      (acc, s) => acc + s.plannedDurationSeconds,
      0,
    );

    validateProjectTransition(
      ProjectStatus.SCRIPT_GENERATING,
      ProjectStatus.AWAITING_APPROVAL,
    );

    const updated = await this.repository.updateByIdAndUser(id, userId, {
      status: ProjectStatus.AWAITING_APPROVAL,
      totalDurationSeconds,
      scenesCount: plannedScenes.length,
      scriptApproved: false,
    });

    const scenes = await this.repository.findScenesForProject(id);
    const sceneDtos = scenes.map((s) => SceneResponseDto.fromEntity(s));
    return ProjectResponseDto.fromEntity(updated!, sceneDtos);
  }

  public async updateScript(
    id: string,
    userId: string,
    dto: UpdateScriptDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.repository.findByIdAndUser(id, userId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (
      project.status !== ProjectStatus.DRAFT &&
      project.status !== ProjectStatus.AWAITING_APPROVAL
    ) {
      throw new BadRequestException(
        `Script cannot be edited while project is in '${project.status}' status`,
      );
    }

    const sceneDocs: Partial<VideoScene>[] = dto.scenes.map((s, idx) => ({
      projectId: project._id,
      userId: project.userId,
      sceneNumber: s.sceneNumber || idx + 1,
      narration: s.narration,
      visualPrompt: s.visualPrompt,
      negativePrompt: s.negativePrompt || '',
      plannedDurationSeconds: s.plannedDurationSeconds || 5,
      providerId: project.providerId,
      modelId: project.modelId,
      generationMode: 'text_to_video',
      continuityNotes: s.continuityNotes || '',
      transition: s.transition || 'none',
      status: SceneStatus.DRAFT,
    }));

    await this.repository.replaceScenesForProject(id, sceneDocs);

    const totalDurationSeconds = sceneDocs.reduce(
      (acc, s) => acc + (s.plannedDurationSeconds || 0),
      0,
    );

    const updated = await this.repository.updateByIdAndUser(id, userId, {
      totalDurationSeconds,
      scenesCount: sceneDocs.length,
      status: ProjectStatus.AWAITING_APPROVAL,
    });

    const scenes = await this.repository.findScenesForProject(id);
    const sceneDtos = scenes.map((s) => SceneResponseDto.fromEntity(s));
    return ProjectResponseDto.fromEntity(updated!, sceneDtos);
  }

  public async approveScript(
    id: string,
    userId: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.repository.findByIdAndUser(id, userId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.status !== ProjectStatus.AWAITING_APPROVAL) {
      throw new BadRequestException(
        `Only projects in 'awaiting_approval' status can be approved. Current status: '${project.status}'`,
      );
    }

    const scenes = await this.repository.findScenesForProject(id);
    if (scenes.length === 0) {
      throw new BadRequestException(
        'Cannot approve script without any planned scenes',
      );
    }

    validateProjectTransition(project.status, ProjectStatus.QUEUED);

    const updated = await this.repository.updateByIdAndUser(id, userId, {
      status: ProjectStatus.QUEUED,
      scriptApproved: true,
    });

    const sceneDtos = scenes.map((s) => SceneResponseDto.fromEntity(s));
    return ProjectResponseDto.fromEntity(updated!, sceneDtos);
  }
}

