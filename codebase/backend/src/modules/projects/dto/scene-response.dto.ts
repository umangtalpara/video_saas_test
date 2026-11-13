import { ApiProperty } from '@nestjs/swagger';
import { SceneStatus, VideoScene } from '../schemas/scene.schema';

export class SceneResponseDto {
  @ApiProperty({ example: '664f1c7d23a10c0012e8b41a' })
  id!: string;

  @ApiProperty({ example: '664f1c7d23a10c0012e8b41b' })
  projectId!: string;

  @ApiProperty({ example: 1 })
  sceneNumber!: number;

  @ApiProperty({ example: 'The neon lights reflected on the damp pavement...' })
  narration!: string;

  @ApiProperty({ example: 'Cinematic wide drone shot of futuristic Tokyo skyline in heavy rain' })
  visualPrompt!: string;

  @ApiProperty({ example: 'blurry, static, low quality' })
  negativePrompt!: string;

  @ApiProperty({ example: 5 })
  plannedDurationSeconds!: number;

  @ApiProperty({ example: 'runway' })
  providerId!: string;

  @ApiProperty({ example: 'gen-3-alpha-turbo' })
  modelId!: string;

  @ApiProperty({ example: 'text_to_video' })
  generationMode!: string;

  @ApiProperty({ example: 'Keep camera moving forward smoothly' })
  continuityNotes!: string;

  @ApiProperty({ example: 'none' })
  transition!: string;

  @ApiProperty({ enum: SceneStatus, example: SceneStatus.DRAFT })
  status!: SceneStatus;

  @ApiProperty({ example: null, nullable: true })
  videoAssetUrl!: string | null;

  @ApiProperty({ example: null, nullable: true })
  thumbnailUrl!: string | null;

  @ApiProperty({ example: 0 })
  actualDurationSeconds!: number;

  @ApiProperty({ example: '1080p' })
  resolution!: string;

  public static fromEntity(
    scene: VideoScene & { _id: { toString(): string } },
  ): SceneResponseDto {
    const dto = new SceneResponseDto();
    dto.id = scene._id.toString();
    dto.projectId = scene.projectId.toString();
    dto.sceneNumber = scene.sceneNumber;
    dto.narration = scene.narration;
    dto.visualPrompt = scene.visualPrompt;
    dto.negativePrompt = scene.negativePrompt;
    dto.plannedDurationSeconds = scene.plannedDurationSeconds;
    dto.providerId = scene.providerId;
    dto.modelId = scene.modelId;
    dto.generationMode = scene.generationMode;
    dto.continuityNotes = scene.continuityNotes;
    dto.transition = scene.transition;
    dto.status = scene.status;
    dto.videoAssetUrl = scene.videoAssetUrl;
    dto.thumbnailUrl = scene.thumbnailUrl;
    dto.actualDurationSeconds = scene.actualDurationSeconds;
    dto.resolution = scene.resolution;
    return dto;
  }
}

