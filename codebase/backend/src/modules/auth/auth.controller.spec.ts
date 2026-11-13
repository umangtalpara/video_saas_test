import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole, UserStatus } from '../users/schemas/user.schema';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      getMe: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      verifyEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should register user and return tokens', async () => {
    const expectedResponse = {
      user: {
        id: '123',
        name: 'Alex',
        email: 'alex@example.com',
        role: UserRole.USER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerifiedAt: null,
        preferences: { language: 'en', timezone: 'UTC', theme: 'system' },
        createdAt: new Date(),
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      },
    };

    authService.register.mockResolvedValue(expectedResponse);

    const result = await controller.register({
      name: 'Alex',
      email: 'alex@example.com',
      password: 'Password123!',
    });

    expect(result).toBe(expectedResponse);
    expect(authService.register).toHaveBeenCalled();
  });

  it('should get current user profile', async () => {
    const expectedUser = {
      id: '123',
      name: 'Alex',
      email: 'alex@example.com',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      preferences: { language: 'en', timezone: 'UTC', theme: 'system' },
      createdAt: new Date(),
    };

    authService.getMe.mockResolvedValue(expectedUser);

    const result = await controller.getMe('123');
    expect(result).toBe(expectedUser);
    expect(authService.getMe).toHaveBeenCalledWith('123');
  });

  it('should logout user', async () => {
    authService.logout.mockResolvedValue(undefined);

    const result = await controller.logout('123');
    expect(result.message).toContain('Successfully logged out');
    expect(authService.logout).toHaveBeenCalledWith('123');
  });
});

