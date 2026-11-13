import { ApiProperty } from '@nestjs/swagger';
import { ProviderModel } from '../schemas/provider-model.schema';

export class ProviderModelResponseDto {
  @ApiProperty({ example: 'runway' })
  providerId!: string;

  @ApiProperty({ example: 'gen-3-alpha-turbo' })
  modelId!: string;

  @ApiProperty({ example: 'Gen-3 Alpha Turbo' })
  displayName!: string;

  @ApiProperty({ example: 'Fast high-definition text-to-video' })
  description!: string;

  @ApiProperty({ example: ['text_to_video', 'image_to_video'] })
  capabilities!: string[];

  @ApiProperty({ example: ['16:9', '9:16', '1:1'] })
  supportedAspectRatios!: string[];

  @ApiProperty({ example: ['720p', '1080p'] })
  supportedResolutions!: string[];

  @ApiProperty({ example: 5 })
  minDurationSeconds!: number;

  @ApiProperty({ example: 10 })
  maxDurationSeconds!: number;

  @ApiProperty({ example: true })
  isAsync!: boolean;

  @ApiProperty({ example: 0.05 })
  estimatedCostPerSecond!: number;

  @ApiProperty({ example: false })
  freeQuotaEligible!: boolean;

  @ApiProperty({ example: true })
  isEnabled!: boolean;

  @ApiProperty({ example: '2026-11-13T12:00:00.000Z' })
  createdAt?: Date;

  public static fromEntity(model: ProviderModel): ProviderModelResponseDto {
    const dto = new ProviderModelResponseDto();
    dto.providerId = model.providerId;
    dto.modelId = model.modelId;
    dto.displayName = model.displayName;
    dto.description = model.description;
    dto.capabilities = model.capabilities;
    dto.supportedAspectRatios = model.supportedAspectRatios;
    dto.supportedResolutions = model.supportedResolutions;
    dto.minDurationSeconds = model.minDurationSeconds;
    dto.maxDurationSeconds = model.maxDurationSeconds;
    dto.isAsync = model.isAsync;
    dto.estimatedCostPerSecond = model.estimatedCostPerSecond;
    dto.freeQuotaEligible = model.freeQuotaEligible;
    dto.isEnabled = model.isEnabled;
    dto.createdAt = model.createdAt;
    return dto;
  }
}

