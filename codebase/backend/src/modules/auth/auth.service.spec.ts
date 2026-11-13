import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { UserRole, UserStatus } from '../users/schemas/user.schema';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(() => {
    usersService = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByVerificationToken: jest.fn(),
      findByPasswordResetToken: jest.fn(),
      update: jest.fn(),
      updateRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn((key: string, defaultVal: string) => defaultVal || 'mock-secret'),
    } as unknown as jest.Mocked<ConfigService>;

    mailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<MailService>;

    authService = new AuthService(
      usersService,
      jwtService,
      configService,
      mailService,
    );
  });

  describe('register', () => {
    it('should hash password with bcrypt and create user', async () => {
      (bcrypt.hash as jest.Mock)
        .mockResolvedValueOnce('hashed-password')
        .mockResolvedValueOnce('hashed-refresh-token');

      const mockCreatedUser = {
        _id: { toString: () => 'user-123' },
        name: 'Alex Smith',
        email: 'alex@example.com',
        role: UserRole.USER,
        status: UserStatus.PENDING_VERIFICATION,
        preferences: { language: 'en', timezone: 'UTC', theme: 'system' },
        createdAt: new Date(),
      };

      usersService.create.mockResolvedValue(mockCreatedUser as never);

      const result = await authService.register({
        name: 'Alex Smith',
        email: 'alex@example.com',
        password: 'Password123!',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
      expect(usersService.create).toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        'alex@example.com',
        'Alex Smith',
        expect.any(String),
      );
      expect(result.tokens.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('alex@example.com');
    });
  });

  describe('login', () => {
    it('should authenticate user and return tokens when credentials match', async () => {
      const mockUser = {
        _id: { toString: () => 'user-123' },
        name: 'Alex Smith',
        email: 'alex@example.com',
        passwordHash: 'hashed-pwd',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        preferences: { language: 'en', timezone: 'UTC', theme: 'system' },
        createdAt: new Date(),
      };

      usersService.findByEmail.mockResolvedValue(mockUser as never);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');

      const result = await authService.login({
        email: 'alex@example.com',
        password: 'Password123!',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('Password123!', 'hashed-pwd');
      expect(result.tokens.accessToken).toBe('mock-jwt-token');
      expect(result.user.id).toBe('user-123');
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const mockUser = {
        _id: { toString: () => 'user-123' },
        passwordHash: 'hashed-pwd',
        status: UserStatus.ACTIVE,
      };

      usersService.findByEmail.mockResolvedValue(mockUser as never);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: 'alex@example.com', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should clear refresh token in database', async () => {
      await authService.logout('user-123');
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('user-123', null);
    });
  });

  describe('verifyEmail', () => {
    it('should set status to active when token is valid', async () => {
      const mockUser = {
        _id: { toString: () => 'user-123' },
      };
      usersService.findByVerificationToken.mockResolvedValue(mockUser as never);

      const result = await authService.verifyEmail({ token: 'valid-token' });

      expect(usersService.update).toHaveBeenCalledWith('user-123', {
        status: UserStatus.ACTIVE,
        emailVerifiedAt: expect.any(Date),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });
      expect(result.message).toContain('Email verified successfully');
    });

    it('should throw BadRequestException if token is invalid or expired', async () => {
      usersService.findByVerificationToken.mockResolvedValue(null);

      await expect(
        authService.verifyEmail({ token: 'invalid-token' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

