import { ApiProperty } from '@nestjs/swagger';
import {
  AuthType,
  BillingClassification,
  Provider,
  ProviderType,
} from '../schemas/provider.schema';

export class ProviderResponseDto {
  @ApiProperty({ example: 'runway' })
  providerId!: string;

  @ApiProperty({ example: 'Runway' })
  displayName!: string;

  @ApiProperty({ example: 'Runway AI, Inc.' })
  company!: string;

  @ApiProperty({ example: 'United States' })
  country!: string;

  @ApiProperty({ enum: ProviderType, example: ProviderType.DIRECT })
  providerType!: ProviderType;

  @ApiProperty({ example: 'https://docs.runwayml.com' })
  documentationUrl!: string;

  @ApiProperty({ example: 'https://api.runwayml.com/v1' })
  apiBaseUrl!: string;

  @ApiProperty({ enum: AuthType, example: AuthType.BEARER })
  authType!: AuthType;

  @ApiProperty({ example: 'Authorization' })
  authHeaderName!: string;

  @ApiProperty({ example: ['text_to_video', 'image_to_video'] })
  capabilities!: string[];

  @ApiProperty({
    enum: BillingClassification,
    example: BillingClassification.USER_MANAGED,
  })
  billingClassification!: BillingClassification;

  @ApiProperty({ example: {} })
  freeQuotaPolicy!: Record<string, unknown>;

  @ApiProperty({ example: true })
  isEnabled!: boolean;

  @ApiProperty({ example: false })
  isMaintenance!: boolean;

  @ApiProperty({ example: 'Terms notes' })
  termsNotes!: string;

  @ApiProperty({ example: [] })
  regionRestrictions!: string[];

  @ApiProperty({ example: '2026-11-13T12:00:00.000Z' })
  createdAt?: Date;

  public static fromEntity(provider: Provider): ProviderResponseDto {
    const dto = new ProviderResponseDto();
    dto.providerId = provider.providerId;
    dto.displayName = provider.displayName;
    dto.company = provider.company;
    dto.country = provider.country;
    dto.providerType = provider.providerType;
    dto.documentationUrl = provider.documentationUrl;
    dto.apiBaseUrl = provider.apiBaseUrl;
    dto.authType = provider.authType;
    dto.authHeaderName = provider.authHeaderName;
    dto.capabilities = provider.capabilities;
    dto.billingClassification = provider.billingClassification;
    dto.freeQuotaPolicy = provider.freeQuotaPolicy;
    dto.isEnabled = provider.isEnabled;
    dto.isMaintenance = provider.isMaintenance;
    dto.termsNotes = provider.termsNotes;
    dto.regionRestrictions = provider.regionRestrictions;
    dto.createdAt = provider.createdAt;
    return dto;
  }
}

