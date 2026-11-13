import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { UserRole, UserStatus } from '../../users/schemas/user.schema';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: jest.Mocked<UsersService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue('test-secret-at-least-32-characters-long'),
    } as unknown as jest.Mocked<ConfigService>;

    usersService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    strategy = new JwtStrategy(configService, usersService);
  });

  it('should validate and return user payload when user is active', async () => {
    const mockUser = {
      _id: { toString: () => 'usr-123' },
      email: 'alex@example.com',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    };
    usersService.findById.mockResolvedValue(mockUser as never);

    const payload: JwtPayload = {
      sub: 'usr-123',
      email: 'alex@example.com',
      role: UserRole.USER,
    };

    const result = await strategy.validate(payload);
    expect(result).toEqual({
      sub: 'usr-123',
      email: 'alex@example.com',
      role: UserRole.USER,
    });
  });

  it('should throw UnauthorizedException if user does not exist', async () => {
    usersService.findById.mockResolvedValue(null as never);

    const payload: JwtPayload = {
      sub: 'nonexistent',
      email: 'alex@example.com',
      role: UserRole.USER,
    };

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if user account is suspended', async () => {
    const suspendedUser = {
      _id: { toString: () => 'usr-123' },
      email: 'alex@example.com',
      role: UserRole.USER,
      status: UserStatus.SUSPENDED,
    };
    usersService.findById.mockResolvedValue(suspendedUser as never);

    const payload: JwtPayload = {
      sub: 'usr-123',
      email: 'alex@example.com',
      role: UserRole.USER,
    };

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

