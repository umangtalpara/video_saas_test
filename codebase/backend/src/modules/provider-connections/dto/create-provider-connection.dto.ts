import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProviderConnectionDto {
  @ApiProperty({ example: 'runway', description: 'Provider identifier from catalog' })
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @ApiProperty({ example: 'My Runway Production Key', description: 'Friendly name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  displayName!: string;

  @ApiProperty({
    example: 'sk-runway1234567890abcdef',
    description: 'Raw API key or secret token. Encrypted via AES-256-GCM before storage.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  apiKey!: string;

  @ApiPropertyOptional({ example: 'global', default: 'global' })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({ example: 'https://api.runwayml.com/v1' })
  @IsString()
  @IsOptional()
  customBaseUrl?: string;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  dailyJobLimit?: number;

  @ApiPropertyOptional({ example: 500, default: 500 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  monthlyJobLimit?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxCostPerProject?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  blockPaidOrUnknownProviders?: boolean;
}

