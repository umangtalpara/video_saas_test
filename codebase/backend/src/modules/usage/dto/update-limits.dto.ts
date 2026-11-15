import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateLimitsDto {
  @ApiPropertyOptional({ example: 30, description: 'Maximum video jobs allowed per day' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  dailyJobCap?: number;

  @ApiPropertyOptional({ example: 300, description: 'Maximum video jobs allowed per month' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  monthlyJobCap?: number;

  @ApiPropertyOptional({ example: 15.0, description: 'Maximum estimated cost in USD per project' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxCostPerProjectUsd?: number;

  @ApiPropertyOptional({ example: true, description: 'Strict protection: block paid/unknown providers' })
  @IsOptional()
  @IsBoolean()
  blockPaidProviders?: boolean;

  @ApiPropertyOptional({ example: ['wan', 'mock'], description: 'Whitelist of allowed provider IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedProviders?: string[];
}

