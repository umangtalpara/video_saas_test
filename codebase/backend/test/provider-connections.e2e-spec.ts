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
import { ProvidersModule } from '../src/modules/providers/providers.module';
import { ProviderConnectionsModule } from '../src/modules/provider-connections/provider-connections.module';
import { JwtService } from '@nestjs/jwt';
import { ProvidersService } from '../src/modules/providers/providers.service';
import { UsersService } from '../src/modules/users/users.service';
import { UserRole, UserStatus } from '../src/modules/users/schemas/user.schema';
import {
  AuthType,
  BillingClassification,
  ProviderType,
} from '../src/modules/providers/schemas/provider.schema';
import { ProviderConnectionsRepository } from '../src/modules/provider-connections/provider-connections.repository';
import { ConnectionStatus } from '../src/modules/provider-connections/schemas/provider-connection.schema';

describe('ProviderConnectionsController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const userAId = new Types.ObjectId().toString();
  const userBId = new Types.ObjectId().toString();
  let userAToken: string;
  let userBToken: string;

  const mockDbConnections: Array<{
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    providerId: string;
    displayName: string;
    encryptedCredentials: {
      ciphertext: string;
      iv: string;
      authTag: string;
      keyVersion: number;
    };
    maskedKey: string;
    region: string;
    customBaseUrl: string;
    status: ConnectionStatus;
    lastTestedAt: Date | null;
    lastSuccessAt: Date | null;
    lastErrorCode: string;
    lastErrorMessage: string;
    dailyJobLimit: number;
    monthlyJobLimit: number;
    maxCostPerProject: number;
    blockPaidOrUnknownProviders: boolean;
    isEnabled: boolean;
    createdAt: Date;
  }> = [];

  const mockProvider = {
    providerId: 'runway',
    displayName: 'Runway',
    company: 'Runway AI',
    country: 'United States',
    providerType: ProviderType.DIRECT,
    documentationUrl: 'https://docs.runwayml.com',
    apiBaseUrl: 'https://api.runwayml.com',
    authType: AuthType.BEARER,
    authHeaderName: 'Authorization',
    capabilities: ['text_to_video'],
    billingClassification: BillingClassification.USER_MANAGED,
    freeQuotaPolicy: {},
    isEnabled: true,
    isMaintenance: false,
    termsNotes: '',
    regionRestrictions: [],
    createdAt: new Date(),
  };

  const mockUsersService = {
    findById: jest.fn().mockImplementation((id: string) => {
      return Promise.resolve({
        _id: new Types.ObjectId(id),
        name: id === userAId ? 'User A' : 'User B',
        email: id === userAId ? 'usera@example.com' : 'userb@example.com',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
    }),
  };

  const mockConnectionsRepo = {
    findAllByUser: jest.fn().mockImplementation((userId: string) => {
      const uId = new Types.ObjectId(userId);
      const matches = mockDbConnections.filter((c) => c.userId.equals(uId));
      return Promise.resolve(matches);
    }),
    findByIdAndUser: jest.fn().mockImplementation((id: string, userId: string) => {
      const cId = new Types.ObjectId(id);
      const uId = new Types.ObjectId(userId);
      const found = mockDbConnections.find(
        (c) => c._id.equals(cId) && c.userId.equals(uId),
      );
      return Promise.resolve(found || null);
    }),
    create: jest.fn().mockImplementation((data: Record<string, unknown>) => {
      const created = {
        _id: new Types.ObjectId(),
        userId: data['userId'] as Types.ObjectId,
        providerId: data['providerId'] as string,
        displayName: data['displayName'] as string,
        encryptedCredentials: data['encryptedCredentials'] as {
          ciphertext: string;
          iv: string;
          authTag: string;
          keyVersion: number;
        },
        maskedKey: data['maskedKey'] as string,
        region: (data['region'] as string) || 'global',
        customBaseUrl: (data['customBaseUrl'] as string) || '',
        status: ConnectionStatus.UNTESTED,
        lastTestedAt: null,
        lastSuccessAt: null,
        lastErrorCode: '',
        lastErrorMessage: '',
        dailyJobLimit: 50,
        monthlyJobLimit: 500,
        maxCostPerProject: 0,
        blockPaidOrUnknownProviders: false,
        isEnabled: true,
        createdAt: new Date(),
      };
      mockDbConnections.push(created);
      return Promise.resolve(created);
    }),
    updateByIdAndUser: jest
      .fn()
      .mockImplementation(
        (id: string, userId: string, update: Record<string, unknown>) => {
          const cId = new Types.ObjectId(id);
          const uId = new Types.ObjectId(userId);
          const index = mockDbConnections.findIndex(
            (c) => c._id.equals(cId) && c.userId.equals(uId),
          );
          if (index === -1) return Promise.resolve(null);
          const existing = mockDbConnections[index]!;
          const updated = { ...existing, ...update };
          mockDbConnections[index] = updated;
          return Promise.resolve(updated);
        },
      ),
    deleteByIdAndUser: jest.fn().mockImplementation((id: string, userId: string) => {
      const cId = new Types.ObjectId(id);
      const uId = new Types.ObjectId(userId);
      const index = mockDbConnections.findIndex(
        (c) => c._id.equals(cId) && c.userId.equals(uId),
      );
      if (index === -1) return Promise.resolve(false);
      mockDbConnections.splice(index, 1);
      return Promise.resolve(true);
    }),
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
        ProvidersModule,
        ProviderConnectionsModule,
      ],
    })
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .overrideProvider(ProvidersService)
      .useValue({
        findProviderById: jest.fn().mockResolvedValue(mockProvider),
      })
      .overrideProvider(ProviderConnectionsRepository)
      .useValue(mockConnectionsRepo)
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

    jwtService = moduleFixture.get<JwtService>(JwtService);
    userAToken = jwtService.sign({ sub: userAId, email: 'usera@example.com', role: 'user' });
    userBToken = jwtService.sign({ sub: userBId, email: 'userb@example.com', role: 'user' });
  });

  afterAll(async () => {
    await app.close();
  });

  let createdConnectionId: string;

  it('User A creates a provider connection with encrypted key', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/provider-connections')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        providerId: 'runway',
        displayName: 'User A Runway Key',
        apiKey: 'sk-runway-secret-key-123456789',
        region: 'global',
      })
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.maskedKey).toBe('sk-****6789');
    expect(response.body.encryptedCredentials).toBeUndefined();
    expect(response.body.status).toBe(ConnectionStatus.UNTESTED);
    createdConnectionId = response.body.id;
  });

  it('User B cannot see User A connection in list (Tenant Isolation)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/provider-connections')
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    expect(response.body).toHaveLength(0);
  });

  it('User B cannot access User A connection by ID (Tenant Isolation)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/provider-connections/${createdConnectionId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(404);
  });

  it('User A can test their provider connection', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/provider-connections/${createdConnectionId}/test`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(response.body.isValid).toBe(true);
    expect(response.body.status).toBe(ConnectionStatus.VALID);
    expect(response.body.latencyMs).toBeGreaterThan(0);
  });

  it('User B cannot delete User A connection (Tenant Isolation)', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/provider-connections/${createdConnectionId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(404);
  });

  it('User A can delete their connection', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/provider-connections/${createdConnectionId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(mockDbConnections).toHaveLength(0);
  });
});
