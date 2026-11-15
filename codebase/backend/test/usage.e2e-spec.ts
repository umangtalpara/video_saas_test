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
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../src/modules/users/users.service';
import { UserRole, UserStatus } from '../src/modules/users/schemas/user.schema';
import { UsageRepository } from '../src/modules/usage/usage.repository';

describe('Usage & Limits (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const userAId = new Types.ObjectId().toString();
  const userBId = new Types.ObjectId().toString();
  let userAToken: string;
  let userBToken: string;

  const mockLimits = {
    userId: new Types.ObjectId(userAId),
    dailyJobCap: 25,
    monthlyJobCap: 250,
    maxCostPerProjectUsd: 10.0,
    blockPaidProviders: true,
    allowedProviders: ['mock', 'wan'],
  };

  const mockUsageRepository = {
    getLimits: jest.fn().mockImplementation((uId: string) => {
      if (uId === userAId) return Promise.resolve(mockLimits);
      return Promise.resolve(null);
    }),
    upsertLimits: jest.fn().mockImplementation((uId: string, update: Record<string, unknown>) => {
      return Promise.resolve({ ...mockLimits, userId: new Types.ObjectId(uId), ...update });
    }),
    countByUserAndPeriod: jest.fn().mockResolvedValue(4),
    sumCostByUserAndPeriod: jest.fn().mockResolvedValue(0.45),
    aggregateByUserAndProvider: jest.fn().mockResolvedValue([
      { providerId: 'wan', totalUnits: 25, totalCost: 0.45, callCount: 4 },
    ]),
    findByUser: jest.fn().mockResolvedValue([
      {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(userAId),
        providerId: 'wan',
        modelId: 'wan-2.1',
        operation: 'video_generation',
        status: 'success',
        unitsConsumed: 5,
        durationSeconds: 5,
        costEstimatedUsd: 0.1,
        isPaid: false,
        createdAt: new Date(),
      },
    ]),
  };

  const mockUsersService = {
    findById: jest.fn().mockImplementation((id: string) => {
      return Promise.resolve({
        _id: new Types.ObjectId(id),
        email: id === userAId ? 'usera@example.com' : 'userb@example.com',
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
      ],
    })
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .overrideProvider(UsageRepository)
      .useValue(mockUsageRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    userAToken = jwtService.sign({
      sub: userAId,
      email: 'usera@example.com',
      role: UserRole.USER,
    });
    userBToken = jwtService.sign({
      sub: userBId,
      email: 'userb@example.com',
      role: UserRole.USER,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/usage/summary', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/usage/summary').expect(401);
    });

    it('returns usage summary for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/usage/summary')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.jobsToday).toBe(4);
      expect(res.body.jobsThisMonth).toBe(4);
      expect(res.body.dailyLimit).toBe(25);
      expect(res.body.monthlyLimit).toBe(250);
      expect(res.body.totalCostUsd).toBe(0.45);
      expect(Array.isArray(res.body.providerBreakdown)).toBe(true);
    });
  });

  describe('GET /api/v1/usage/limits', () => {
    it('returns effective user limits configuration', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/usage/limits')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.dailyJobCap).toBe(25);
      expect(res.body.monthlyJobCap).toBe(250);
      expect(res.body.blockPaidProviders).toBe(true);
    });
  });

  describe('PATCH /api/v1/usage/limits', () => {
    it('updates user limits with valid payload', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/usage/limits')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          dailyJobCap: 50,
          monthlyJobCap: 500,
          blockPaidProviders: false,
        })
        .expect(200);

      expect(res.body.dailyJobCap).toBe(50);
      expect(res.body.monthlyJobCap).toBe(500);
      expect(res.body.blockPaidProviders).toBe(false);
    });

    it('rejects invalid limit values with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/usage/limits')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          dailyJobCap: 50000, // Exceeds max 1000
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/usage/logs', () => {
    it('returns paginated usage logs for user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/usage/logs?limit=10&skip=0')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].providerId).toBe('wan');
    });
  });
});
