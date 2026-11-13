import { ApiProperty } from '@nestjs/swagger';
import { User, UserRole, UserStatus } from '../schemas/user.schema';

export class UserResponseDto {
  @ApiProperty({ example: '664f1c7d23a10c0012e8b41a' })
  id!: string;

  @ApiProperty({ example: 'Alex Smith' })
  name!: string;

  @ApiProperty({ example: 'alex@example.com' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status!: UserStatus;

  @ApiProperty({ example: '2026-11-13T12:00:00.000Z', nullable: true })
  emailVerifiedAt!: Date | null;

  @ApiProperty({
    example: { language: 'en', timezone: 'UTC', theme: 'system' },
  })
  preferences!: {
    language: string;
    timezone: string;
    theme: string;
  };

  @ApiProperty({ example: '2026-11-13T12:00:00.000Z' })
  createdAt!: Date;

  public static fromEntity(user: User & { _id: { toString(): string } }): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user._id.toString();
    dto.name = user.name;
    dto.email = user.email;
    dto.role = user.role;
    dto.status = user.status;
    dto.emailVerifiedAt = user.emailVerifiedAt ?? null;
    dto.preferences = user.preferences ?? {
      language: 'en',
      timezone: 'UTC',
      theme: 'system',
    };
    dto.createdAt = user.createdAt ?? new Date();
    return dto;
  }
}

