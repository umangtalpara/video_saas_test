import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserStatus } from '../../users/schemas/user.schema';

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.SUSPENDED,
    description: 'Updated user status (active | suspended)',
  })
  @IsNotEmpty()
  @IsEnum(UserStatus)
  status!: UserStatus;
}
