import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import {
  AuthType,
  BillingClassification,
  ProviderType,
} from '../schemas/provider.schema';

export class CreateProviderDto {
  @ApiProperty({ example: 'runway', description: 'Unique provider identifier' })
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @ApiProperty({ example: 'Runway', description: 'Provider display name' })
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @ApiProperty({ example: 'Runway AI, Inc.', description: 'Company name' })
  @IsString()
  @IsNotEmpty()
  company!: string;

  @ApiPropertyOptional({ example: 'United States' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ enum: ProviderType, default: ProviderType.DIRECT })
  @IsEnum(ProviderType)
  @IsOptional()
  providerType?: ProviderType;

  @ApiProperty({ example: 'https://docs.runwayml.com' })
  @IsUrl()
  @IsNotEmpty()
  documentationUrl!: string;

  @ApiProperty({ example: 'https://api.runwayml.com/v1' })
  @IsUrl()
  @IsNotEmpty()
  apiBaseUrl!: string;

  @ApiPropertyOptional({ enum: AuthType, default: AuthType.BEARER })
  @IsEnum(AuthType)
  @IsOptional()
  authType?: AuthType;

  @ApiPropertyOptional({ example: 'Authorization' })
  @IsString()
  @IsOptional()
  authHeaderName?: string;

  @ApiPropertyOptional({ example: ['text_to_video', 'image_to_video'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  capabilities?: string[];

  @ApiPropertyOptional({
    enum: BillingClassification,
    default: BillingClassification.USER_MANAGED,
  })
  @IsEnum(BillingClassification)
  @IsOptional()
  billingClassification?: BillingClassification;

  @ApiPropertyOptional({ example: { monthlyCredits: 125, isRenewable: true } })
  @IsObject()
  @IsOptional()
  freeQuotaPolicy?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isMaintenance?: boolean;

  @ApiPropertyOptional({ example: 'Commercial use permitted under valid license' })
  @IsString()
  @IsOptional()
  termsNotes?: string;

  @ApiPropertyOptional({ example: ['US', 'EU', 'IN'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  regionRestrictions?: string[];
}

