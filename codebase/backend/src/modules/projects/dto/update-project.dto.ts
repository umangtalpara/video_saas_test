import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AspectRatio } from '../schemas/project.schema';

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Updated Project Title' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated prompt content...' })
  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(3000)
  prompt?: string;

  @ApiPropertyOptional({ enum: [30, 60, 90, 120] })
  @IsNumber()
  @IsIn([30, 60, 90, 120])
  @IsOptional()
  targetDurationSeconds?: number;

  @ApiPropertyOptional({ enum: AspectRatio })
  @IsEnum(AspectRatio)
  @IsOptional()
  aspectRatio?: AspectRatio;

  @ApiPropertyOptional({ example: 'en' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ example: 'realistic' })
  @IsString()
  @IsOptional()
  style?: string;

  @ApiPropertyOptional({ example: 'luma' })
  @IsString()
  @IsOptional()
  providerId?: string;

  @ApiPropertyOptional({ example: '664f1c7d23a10c0012e8b41a' })
  @IsString()
  @IsOptional()
  providerConnectionId?: string;

  @ApiPropertyOptional({ example: 'ray-2' })
  @IsString()
  @IsOptional()
  modelId?: string;
}

