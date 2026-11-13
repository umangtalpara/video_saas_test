import { ApiProperty } from '@nestjs/swagger';
import {
  AspectRatio,
  ProjectStatus,
  VideoProject,
} from '../schemas/project.schema';
import { SceneResponseDto } from './scene-response.dto';

export class ProjectResponseDto {
  @ApiProperty({ example: '664f1c7d23a10c0012e8b41a' })
  id!: string;

  @ApiProperty({ example: 'Future Cyberpunk City' })
  title!: string;

  @ApiProperty({ example: 'A cinematic drone flight over a rainy neon-lit Tokyo in 2099' })
  prompt!: string;

  @ApiProperty({ example: 30 })
  targetDurationSeconds!: number;

  @ApiProperty({ enum: AspectRatio, example: AspectRatio.PORTRAIT })
  aspectRatio!: AspectRatio;

  @ApiProperty({ example: 'en' })
  language!: string;

  @ApiProperty({ example: 'cinematic' })
  style!: string;

  @ApiProperty({ enum: ProjectStatus, example: ProjectStatus.DRAFT })
  status!: ProjectStatus;

  @ApiProperty({ example: 'runway' })
  providerId!: string;

  @ApiProperty({ example: '664f1c7d23a10c0012e8b41b', nullable: true })
  providerConnectionId!: string | null;

  @ApiProperty({ example: 'gen-3-alpha-turbo' })
  modelId!: string;

  @ApiProperty({ example: 30 })
  totalDurationSeconds!: number;

  @ApiProperty({ example: 6 })
  scenesCount!: number;

  @ApiProperty({ example: false })
  scriptApproved!: boolean;

  @ApiProperty({ example: null, nullable: true })
  finalVideoUrl!: string | null;

  @ApiProperty({ example: null, nullable: true })
  thumbnailUrl!: string | null;

  @ApiProperty({ example: '' })
  errorMessage!: string;

  @ApiProperty({ type: [SceneResponseDto], required: false })
  scenes?: SceneResponseDto[];

  @ApiProperty({ example: '2026-11-13T12:00:00.000Z' })
  createdAt?: Date;

  public static fromEntity(
    project: VideoProject & { _id: { toString(): string } },
    scenes?: SceneResponseDto[],
  ): ProjectResponseDto {
    const dto = new ProjectResponseDto();
    dto.id = project._id.toString();
    dto.title = project.title;
    dto.prompt = project.prompt;
    dto.targetDurationSeconds = project.targetDurationSeconds;
    dto.aspectRatio = project.aspectRatio;
    dto.language = project.language;
    dto.style = project.style;
    dto.status = project.status;
    dto.providerId = project.providerId;
    dto.providerConnectionId = project.providerConnectionId
      ? project.providerConnectionId.toString()
      : null;
    dto.modelId = project.modelId;
    dto.totalDurationSeconds = project.totalDurationSeconds;
    dto.scenesCount = project.scenesCount;
    dto.scriptApproved = project.scriptApproved;
    dto.finalVideoUrl = project.finalVideoUrl;
    dto.thumbnailUrl = project.thumbnailUrl;
    dto.errorMessage = project.errorMessage;
    dto.createdAt = project.createdAt;
    if (scenes) {
      dto.scenes = scenes;
    }
    return dto;
  }
}

