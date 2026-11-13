import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AspectRatio } from '../schemas/project.schema';

export class CreateProjectDto {
  @ApiPropertyOptional({ example: 'Future Cyberpunk City' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  title?: string;

  @ApiProperty({
    example: 'A cinematic drone flight over a rainy neon-lit Tokyo in 2099',
    description: 'Initial idea, concept or script prompt',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(3000)
  prompt!: string;

  @ApiPropertyOptional({ example: 30, enum: [30, 60, 90, 120], default: 30 })
  @IsNumber()
  @IsIn([30, 60, 90, 120])
  @IsOptional()
  targetDurationSeconds?: number;

  @ApiPropertyOptional({ enum: AspectRatio, default: AspectRatio.PORTRAIT })
  @IsEnum(AspectRatio)
  @IsOptional()
  aspectRatio?: AspectRatio;

  @ApiPropertyOptional({ example: 'en', default: 'en' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ example: 'cinematic', default: 'cinematic' })
  @IsString()
  @IsOptional()
  style?: string;

  @ApiPropertyOptional({ example: 'runway', default: 'runway' })
  @IsString()
  @IsOptional()
  providerId?: string;

  @ApiPropertyOptional({ example: '664f1c7d23a10c0012e8b41a' })
  @IsString()
  @IsOptional()
  providerConnectionId?: string;

  @ApiPropertyOptional({ example: 'gen-3-alpha-turbo', default: 'gen-3-alpha-turbo' })
  @IsString()
  @IsOptional()
  modelId?: string;
}

