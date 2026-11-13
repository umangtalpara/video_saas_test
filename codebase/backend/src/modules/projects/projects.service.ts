import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectsRepository } from './projects.repository';
import {
  AspectRatio,
  ProjectStatus,
  VideoProject,
  VideoProjectDocument,
} from './schemas/project.schema';
import { VideoScene, VideoSceneDocument } from './schemas/scene.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { SceneResponseDto } from './dto/scene-response.dto';
import { validateProjectTransition } from './project-state-machine';

@Injectable()
export class ProjectsService {
  constructor(private readonly repository: ProjectsRepository) {}

  public validateTransition(current: ProjectStatus, next: ProjectStatus): void {
    validateProjectTransition(current, next);
  }

  public async create(
    userId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    const title =
      dto.title?.trim() ||
      dto.prompt
        .split(/\s+/)
        .slice(0, 6)
        .join(' ')
        .replace(/[^\w\s]/g, '')
        .trim() ||
      'Untitled Video';

    const projectData: Partial<VideoProject> = {
      userId: new Types.ObjectId(userId),
      title,
      prompt: dto.prompt,
      targetDurationSeconds: dto.targetDurationSeconds ?? 30,
      aspectRatio: dto.aspectRatio ?? AspectRatio.PORTRAIT,
      language: dto.language ?? 'en',
      style: dto.style ?? 'cinematic',
      status: ProjectStatus.DRAFT,
      providerId: dto.providerId ?? 'runway',
      providerConnectionId: dto.providerConnectionId
        ? new Types.ObjectId(dto.providerConnectionId)
        : null,
      modelId: dto.modelId ?? 'gen-3-alpha-turbo',
      totalDurationSeconds: 0,
      scenesCount: 0,
      scriptApproved: false,
    };

    const created = await this.repository.create(projectData);
    return ProjectResponseDto.fromEntity(created);
  }

  public async findAll(
    userId: string,
    query: QueryProjectDto,
  ): Promise<{ data: ProjectResponseDto[]; total: number; page: number; limit: number }> {
    const [items, total] = await Promise.all([
      this.repository.findAllForUser(userId, query),
      this.repository.countForUser(userId, query.status),
    ]);
    const data = items.map((p: VideoProjectDocument) =>
      ProjectResponseDto.fromEntity(p),
    );
    return {
      data,
      total,
      page: query.page || 1,
      limit: query.limit || 10,
    };
  }

  public async findOne(
    id: string,
    userId: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.repository.findByIdAndUser(id, userId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const scenes = await this.repository.findScenesForProject(id);
    const sceneDtos = scenes.map((s: VideoSceneDocument) =>
      SceneResponseDto.fromEntity(s),
    );
    return ProjectResponseDto.fromEntity(project, sceneDtos);
  }

  public async update(
    id: string,
    userId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const existing = await this.repository.findByIdAndUser(id, userId);
    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    const updateData: Partial<VideoProject> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.prompt !== undefined) updateData.prompt = dto.prompt;
    if (dto.targetDurationSeconds !== undefined)
      updateData.targetDurationSeconds = dto.targetDurationSeconds;
    if (dto.aspectRatio !== undefined) updateData.aspectRatio = dto.aspectRatio;
    if (dto.language !== undefined) updateData.language = dto.language;
    if (dto.style !== undefined) updateData.style = dto.style;
    if (dto.providerId !== undefined) updateData.providerId = dto.providerId;
    if (dto.providerConnectionId !== undefined) {
      updateData.providerConnectionId = dto.providerConnectionId
        ? new Types.ObjectId(dto.providerConnectionId)
        : null;
    }
    if (dto.modelId !== undefined) updateData.modelId = dto.modelId;

    const updated = await this.repository.updateByIdAndUser(id, userId, updateData);
    if (!updated) {
      throw new NotFoundException('Project not found');
    }
    return ProjectResponseDto.fromEntity(updated);
  }

  public async delete(
    id: string,
    userId: string,
  ): Promise<{ message: string }> {
    const deleted = await this.repository.deleteByIdAndUser(id, userId);
    if (!deleted) {
      throw new NotFoundException('Project not found');
    }
    return { message: 'Project and all associated scenes deleted successfully' };
  }

  public async duplicate(
    id: string,
    userId: string,
  ): Promise<ProjectResponseDto> {
    const original = await this.repository.findByIdAndUser(id, userId);
    if (!original) {
      throw new NotFoundException('Project not found');
    }
    const scenes = await this.repository.findScenesForProject(id);

    const duplicatedProject = await this.repository.create({
      userId: original.userId,
      title: `${original.title} (Copy)`,
      prompt: original.prompt,
      targetDurationSeconds: original.targetDurationSeconds,
      aspectRatio: original.aspectRatio,
      language: original.language,
      style: original.style,
      status: ProjectStatus.DRAFT,
      providerId: original.providerId,
      providerConnectionId: original.providerConnectionId,
      modelId: original.modelId,
      totalDurationSeconds: original.totalDurationSeconds,
      scenesCount: original.scenesCount,
      scriptApproved: false,
    });

    if (scenes.length > 0) {
      const duplicatedScenes: Partial<VideoScene>[] = scenes.map((s) => ({
        projectId: duplicatedProject._id,
        userId: duplicatedProject.userId,
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
        status: s.status,
      }));
      await this.repository.createScenes(duplicatedScenes);
    }

    return this.findOne(duplicatedProject._id.toString(), userId);
  }
}
