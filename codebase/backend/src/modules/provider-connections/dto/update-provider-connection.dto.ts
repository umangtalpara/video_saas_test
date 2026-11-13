import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateProviderConnectionDto {
  @ApiPropertyOptional({ example: 'Updated Key Label' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  displayName?: string;

  @ApiPropertyOptional({
    example: 'sk-new-rotated-key-1234567890',
    description: 'Provide to rotate or replace current key',
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  apiKey?: string;

  @ApiPropertyOptional({ example: 'us-east-1' })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({ example: 'https://custom.endpoint.com' })
  @IsString()
  @IsOptional()
  customBaseUrl?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  dailyJobLimit?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  monthlyJobLimit?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxCostPerProject?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  blockPaidOrUnknownProviders?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

