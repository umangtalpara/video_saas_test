import { ApiProperty } from '@nestjs/swagger';
import {
  ConnectionStatus,
  ProviderConnection,
} from '../schemas/provider-connection.schema';

export class ProviderConnectionResponseDto {
  @ApiProperty({ example: '664f1c7d23a10c0012e8b41a' })
  id!: string;

  @ApiProperty({ example: 'runway' })
  providerId!: string;

  @ApiProperty({ example: 'My Runway Production Key' })
  displayName!: string;

  @ApiProperty({ example: 'sk-****cdef', description: 'Masked key for safe UI display' })
  maskedKey!: string;

  @ApiProperty({ example: 'global' })
  region!: string;

  @ApiProperty({ example: '' })
  customBaseUrl!: string;

  @ApiProperty({ enum: ConnectionStatus, example: ConnectionStatus.VALID })
  status!: ConnectionStatus;

  @ApiProperty({ example: '2026-11-13T12:00:00.000Z', nullable: true })
  lastTestedAt!: Date | null;

  @ApiProperty({ example: '2026-11-13T12:00:00.000Z', nullable: true })
  lastSuccessAt!: Date | null;

  @ApiProperty({ example: '' })
  lastErrorCode!: string;

  @ApiProperty({ example: '' })
  lastErrorMessage!: string;

  @ApiProperty({ example: 50 })
  dailyJobLimit!: number;

  @ApiProperty({ example: 500 })
  monthlyJobLimit!: number;

  @ApiProperty({ example: 0 })
  maxCostPerProject!: number;

  @ApiProperty({ example: false })
  blockPaidOrUnknownProviders!: boolean;

  @ApiProperty({ example: true })
  isEnabled!: boolean;

  @ApiProperty({ example: '2026-11-13T12:00:00.000Z' })
  createdAt?: Date;

  public static fromEntity(
    entity: ProviderConnection & { _id: { toString(): string } },
  ): ProviderConnectionResponseDto {
    const dto = new ProviderConnectionResponseDto();
    dto.id = entity._id.toString();
    dto.providerId = entity.providerId;
    dto.displayName = entity.displayName;
    dto.maskedKey = entity.maskedKey;
    dto.region = entity.region;
    dto.customBaseUrl = entity.customBaseUrl;
    dto.status = entity.status;
    dto.lastTestedAt = entity.lastTestedAt;
    dto.lastSuccessAt = entity.lastSuccessAt;
    dto.lastErrorCode = entity.lastErrorCode;
    dto.lastErrorMessage = entity.lastErrorMessage;
    dto.dailyJobLimit = entity.dailyJobLimit;
    dto.monthlyJobLimit = entity.monthlyJobLimit;
    dto.maxCostPerProject = entity.maxCostPerProject;
    dto.blockPaidOrUnknownProviders = entity.blockPaidOrUnknownProviders;
    dto.isEnabled = entity.isEnabled;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}

