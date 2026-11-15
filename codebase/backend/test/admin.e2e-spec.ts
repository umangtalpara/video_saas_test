import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { Types } from 'mongoose';
import configuration from '../src/config/configuration';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { MailModule } from '../src/modules/mail/mail.module';
import { DatabaseModule } from '../src/database/database.module';
import { ProjectsModule } from '../src/modules/projects/projects.module';
import { GenerationModule } from '../src/modules/generation/generation.module';
import { MediaModule } from '../src/modules/media/media.module';
import { ProviderConnectionsModule } from '../src/modules/provider-connections/provider-connections.module';
import { UsageModule } from '../src/modules/usage/usage.module';
import { AdminModule } from '../src/modules/admin/admin.module';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../src/modules/users/users.service';
import { UserRole, UserStatus } from '../src/modules/users/schemas/user.schema';
import { AdminRepository } from '../src/modules/admin/admin.repository';
import { ProvidersRepository } from '../src/modules/providers/providers.repository';
import { BillingClassification } from '../src/modules/providers/schemas/provider.schema';

describe('Admin API & RBAC (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const adminUserId = new Types.ObjectId().toString();
  const regularUserId = new Types.ObjectId().toString();
  const targetUserId = new Types.ObjectId().toString();

  let adminToken: string;
  let regularUserToken: string;

  const mockTargetUser = {
    _id: new Types.ObjectId(targetUserId),
    name: 'Normal User',
    email: 'normal@example.com',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
  };

  const mockProvider = {
    providerId: 'wan',
    displayName: 'Wan 2.1 Video',
    isEnabled: true,
    billingClassification: BillingClassification.FREE_VERIFIED,
  };

  const mockAdminRepository = {
    getDashboardStats: jest.fn().mockResolvedValue({
      totalUsers: 10,
      activeUsers: 9,
      suspendedUsers: 1,
      totalProjects: 40,
      completedProjects: 35,
      failedProjects: 2,
      renderingProjects: 3,
      totalProviderCalls: 120,
      estimatedCostUsd: 4.5,
    }),
    findAllUsers: jest.fn().mockResolvedValue([mockTargetUser]),
    countUsers: jest.fn().mockResolvedValue(1),
    updateUserStatus: jest.fn().mockImplementation((id: string, status: UserStatus) => {
      if (id === targetUserId) return Promise.resolve({ ...mockTargetUser, status });
      return Promise.resolve(null);
    }),
    createAuditLog: jest.fn().mockResolvedValue({}),
    findRecentJobs: jest.fn().mockResolvedValue([]),
    countJobs: jest.fn().mockResolvedValue(0),
    findAuditLogs: jest.fn().mockResolvedValue([
      {
        _id: new Types.ObjectId(),
        adminUserId: new Types.ObjectId(adminUserId),
        adminEmail: 'admin@videoforge.ai',
        action: 'user_suspension_toggle',
        targetType: 'user',
        targetId: targetUserId,
        details: { newStatus: 'suspended' },
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
      },
    ]),
    countAuditLogs: jest.fn().mockResolvedValue(1),
  };

  const mockProvidersRepository = {
    countProviders: jest.fn().mockResolvedValue(1),
    findAllProviders: jest.fn().mockResolvedValue([mockProvider]),
    findProviderById: jest.fn().mockResolvedValue(mockProvider),
    createProvider: jest.fn().mockResolvedValue(mockProvider),
    createModel: jest.fn().mockResolvedValue({}),
    updateProvider: jest.fn().mockImplementation((id: string, update: Record<string, unknown>) => {
      return Promise.resolve({ ...mockProvider, ...update });
    }),
  };

  const mockUsersService = {
    findById: jest.fn().mockImplementation((id: string) => {
      if (id === adminUserId) {
        return Promise.resolve({
          _id: new Types.ObjectId(adminUserId),
          email: 'admin@videoforge.ai',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
        });
      }
      return Promise.resolve({
        _id: new Types.ObjectId(id),
        email: 'regular@example.com',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
      });
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        AuthModule,
        UsersModule,
        MailModule,
        DatabaseModule,
        ProjectsModule,
        ProviderConnectionsModule,
        MediaModule,
        GenerationModule,
        UsageModule,
        AdminModule,
      ],
    })
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .overrideProvider(AdminRepository)
      .useValue(mockAdminRepository)
      .overrideProvider(ProvidersRepository)
      .useValue(mockProvidersRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    adminToken = jwtService.sign({
      sub: adminUserId,
      email: 'admin@videoforge.ai',
      role: UserRole.ADMIN,
    });
    regularUserToken = jwtService.sign({
      sub: regularUserId,
      email: 'regular@example.com',
      role: UserRole.USER,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('RBAC Protection', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/admin/dashboard').expect(401);
    });

    it('rejects regular users with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/admin/dashboard', () => {
    it('allows admin and returns global statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.stats.totalUsers).toBe(10);
      expect(Array.isArray(res.body.providers)).toBe(true);
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('returns paginated users list for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users?limit=10&skip=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.total).toBe(1);
    });
  });

  describe('PATCH /api/v1/admin/users/:id/status', () => {
    it('allows admin to toggle user suspension', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: UserStatus.SUSPENDED })
        .expect(200);

      expect(res.body.status).toBe(UserStatus.SUSPENDED);
    });

    it('prevents administrator from suspending their own account', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${adminUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: UserStatus.SUSPENDED })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/admin/providers/:id/killswitch', () => {
    it('triggers emergency killswitch to disable provider', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/providers/wan/killswitch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isEnabled: false, reason: 'High API failure rate' })
        .expect(200);

      expect(res.body.isEnabled).toBe(false);
    });
  });

  describe('GET /api/v1/admin/audit-logs', () => {
    it('returns audit log records', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.logs)).toBe(true);
      expect(res.body.total).toBe(1);
      expect(res.body.logs[0].action).toBe('user_suspension_toggle');
    });
  });
});
