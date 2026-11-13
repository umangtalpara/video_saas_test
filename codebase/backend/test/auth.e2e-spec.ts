import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { UsersModule } from '../src/modules/users/users.module';
import { AuthModule } from '../src/modules/auth/auth.module';
import { MailModule } from '../src/modules/mail/mail.module';
import { UsersService } from '../src/modules/users/users.service';
import { UserRole, UserStatus } from '../src/modules/users/schemas/user.schema';
import configuration from '../src/config/configuration';

import { DatabaseModule } from '../src/database/database.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const mockUserDb = new Map<string, Record<string, unknown>>();

  const mockUsersService = {
    create: jest.fn().mockImplementation((data: { name: string; email: string; passwordHash: string }) => {
      const user = {
        _id: { toString: () => 'user-test-id-123' },
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        preferences: { language: 'en', timezone: 'UTC', theme: 'system' },
        createdAt: new Date(),
      };
      mockUserDb.set(data.email, user);
      return Promise.resolve(user);
    }),
    findById: jest.fn().mockImplementation((id: string) => {
      if (id === 'user-test-id-123') {
        return Promise.resolve({
          _id: { toString: () => 'user-test-id-123' },
          name: 'Alex Smith',
          email: 'alex@example.com',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          preferences: { language: 'en', timezone: 'UTC', theme: 'system' },
          createdAt: new Date(),
        });
      }
      return Promise.resolve(null);
    }),
    findByEmail: jest.fn().mockImplementation((email: string) => {
      return Promise.resolve(mockUserDb.get(email) || null);
    }),
    updateRefreshToken: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        DatabaseModule,
        UsersModule,
        MailModule,
        AuthModule,
      ],
    })
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  let accessToken: string;

  it('POST /api/v1/auth/register should create user and return tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Alex Smith',
        email: 'alex@example.com',
        password: 'Password123!',
      })
      .expect(201);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('alex@example.com');
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();

    accessToken = res.body.tokens.accessToken;
  });

  it('POST /api/v1/auth/login should authenticate user with correct credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'alex@example.com',
        password: 'Password123!',
      })
      .expect(200);

    expect(res.body.tokens.accessToken).toBeDefined();
    accessToken = res.body.tokens.accessToken;
  });

  it('GET /api/v1/auth/me should return authenticated user profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBe('alex@example.com');
    expect(res.body.name).toBe('Alex Smith');
  });

  it('GET /api/v1/auth/me should return 401 Unauthorized without token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);
  });

  it('POST /api/v1/auth/logout should invalidate user session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
