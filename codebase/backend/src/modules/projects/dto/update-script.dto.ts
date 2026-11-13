import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateSceneItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  sceneNumber!: number;

  @ApiProperty({ example: 'The morning mist clears to reveal the peak...' })
  @IsString()
  @IsNotEmpty()
  narration!: string;

  @ApiProperty({ example: 'Cinematic wide angle shot of snowy mountain peak' })
  @IsString()
  @IsNotEmpty()
  visualPrompt!: string;

  @ApiPropertyOptional({ example: 'blurry, distorted' })
  @IsString()
  @IsOptional()
  negativePrompt?: string;

  @ApiPropertyOptional({ example: 5, default: 5 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  plannedDurationSeconds?: number;

  @ApiPropertyOptional({ example: 'Keep lighting consistent with previous scene' })
  @IsString()
  @IsOptional()
  continuityNotes?: string;

  @ApiPropertyOptional({ example: 'fade', default: 'none' })
  @IsString()
  @IsOptional()
  transition?: string;
}

export class UpdateScriptDto {
  @ApiProperty({ type: [UpdateSceneItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSceneItemDto)
  scenes!: UpdateSceneItemDto[];
}

