import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ProviderKillswitchDto {
  @ApiProperty({ example: false, description: 'Emergency toggle to enable or kill the provider globally' })
  @IsNotEmpty()
  @IsBoolean()
  isEnabled!: boolean;

  @ApiProperty({ example: 'Rate limit / cost spike mitigation', description: 'Reason for killswitch toggle' })
  @IsOptional()
  @IsString()
  reason?: string;
}
