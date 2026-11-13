import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProviderModelDto {
  @ApiProperty({ example: 'gen-3-alpha-turbo', description: 'Model identifier' })
  @IsString()
  @IsNotEmpty()
  modelId!: string;

  @ApiProperty({ example: 'Gen-3 Alpha Turbo', description: 'Display name' })
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @ApiPropertyOptional({ example: 'Fast high-definition text-to-video model' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: ['text_to_video', 'image_to_video'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  capabilities?: string[];

  @ApiPropertyOptional({ example: ['16:9', '9:16', '1:1'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportedAspectRatios?: string[];

  @ApiPropertyOptional({ example: ['720p', '1080p'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportedResolutions?: string[];

  @ApiPropertyOptional({ example: 5, default: 5 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  minDurationSeconds?: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxDurationSeconds?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isAsync?: boolean;

  @ApiPropertyOptional({ example: 0.05, default: 0 })
  @IsNumber()
  @IsOptional()
  estimatedCostPerSecond?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  freeQuotaEligible?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

