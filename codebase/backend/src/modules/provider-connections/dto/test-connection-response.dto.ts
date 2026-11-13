import { ApiProperty } from '@nestjs/swagger';
import { ConnectionStatus } from '../schemas/provider-connection.schema';

export class TestConnectionResponseDto {
  @ApiProperty({ example: '664f1c7d23a10c0012e8b41a' })
  connectionId!: string;

  @ApiProperty({ example: 'runway' })
  providerId!: string;

  @ApiProperty({ enum: ConnectionStatus, example: ConnectionStatus.VALID })
  status!: ConnectionStatus;

  @ApiProperty({ example: true })
  isValid!: boolean;

  @ApiProperty({ example: 'Connection tested successfully. API key is active and authorized.' })
  message!: string;

  @ApiProperty({ example: 142 })
  latencyMs!: number;

  @ApiProperty({ example: '2026-11-13T12:00:00.000Z' })
  testedAt!: Date;
}

