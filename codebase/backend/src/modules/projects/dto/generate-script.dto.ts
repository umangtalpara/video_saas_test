import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateScriptDto {
  @ApiPropertyOptional({
    example: 'Emphasize high speed camera pans and futuristic synthesizer background',
    description: 'Optional additional directorial instructions for script generation',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  additionalInstructions?: string;
}

