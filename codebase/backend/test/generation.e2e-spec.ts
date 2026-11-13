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
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../src/modules/users/users.service';
import { UserRole, UserStatus } from '../src/modules/users/schemas/user.schema';
import { ProjectsRepository } from '../src/modules/projects/projects.repository';
import { ProjectStatus, AspectRatio } from '../src/modules/projects/schemas/project.schema';
import { SceneStatus } from '../src/modules/projects/schemas/scene.schema';

describe('GenerationController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const userAId = new Types.ObjectId().toString();
  const userBId = new Types.ObjectId().toString();
  let userAToken: string;
  let userBToken: string;

  const projectId = new Types.ObjectId().toString();
  const sceneId = new Types.ObjectId().toString();

  const mockProject = {
    _id: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userAId),
    title: 'Neon Cyberpunk Race',
    prompt: 'Flying cars in neon rain',
    targetDurationSeconds: 10,
    aspectRatio: AspectRatio.LANDSCAPE,
    language: 'en',
    style: 'cinematic',
    status: ProjectStatus.AWAITING_APPROVAL,
    providerId: 'mock',
    providerConnectionId: null,
    modelId: 'mock-model',
    totalDurationSeconds: 10,
    scenesCount: 1,
    scriptApproved: true,
    finalVideoUrl: null,
    thumbnailUrl: null,
    errorMessage: '',
    createdAt: new Date(),
  };

  const mockScene = {
    _id: new Types.ObjectId(sceneId),
    projectId: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userAId),
    sceneNumber: 1,
    narration: 'Speeding through the rain',
    visualPrompt: 'Futuristic speeder flying at night',
    negativePrompt: '',
    plannedDurationSeconds: 5,
    actualDurationSeconds: 0,
    providerId: 'mock',
    modelId: 'mock-model',
    generationMode: 'text_to_video',
    continuityNotes: '',
    transition: 'none',
    status: SceneStatus.DRAFT,
    videoAssetUrl: null,
    thumbnailUrl: null,
    resolution: '',
    errorMessage: '',
  };

  const mockProjectsRepository = {
    findByIdAndUser: jest.fn().mockImplementation((pId: string, uId: string) => {
      if (pId === projectId && uId === userAId) return Promise.resolve(mockProject);
      return Promise.resolve(null);
    }),
    findScenesForProject: jest.fn().mockImplementation((pId: string) => {
      if (pId === projectId) return Promise.resolve([mockScene]);
      return Promise.resolve([]);
    }),
    updateByIdAndUser: jest.fn().mockImplementation((pId: string, uId: string, update: Record<string, unknown>) => {
      if (pId === projectId && uId === userAId) {
        Object.assign(mockProject, update);
        return Promise.resolve(mockProject);
      }
      return Promise.resolve(null);
    }),
    updateScene: jest.fn().mockImplementation((sId: string, pId: string, uId: string, update: Record<string, unknown>) => {
      if (sId === sceneId && pId === projectId && uId === userAId) {
        Object.assign(mockScene, update);
        return Promise.resolve(mockScene);
      }
      return Promise.resolve(null);
    }),
    findProjectsByStatuses: jest.fn().mockResolvedValue([]),
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
      ],
    })
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .overrideProvider(ProjectsRepository)
      .useValue(mockProjectsRepository)
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

  it('POST /api/v1/projects/:id/generate - queues video generation (202 Accepted)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/generate`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(202);

    expect(res.body.projectId).toBe(projectId);
    expect(res.body.status).toBe('queued');
  });

  it('GET /api/v1/projects/:id/generation-status - returns progress and scene breakdown', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/generation-status`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(res.body.projectId).toBe(projectId);
    expect(res.body.scenesCount).toBe(1);
    expect(Array.isArray(res.body.scenes)).toBe(true);
  });

  it('POST /api/v1/projects/:id/scenes/:sceneId/retry - retries scene (202 Accepted)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/scenes/${sceneId}/retry`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(202);

    expect(res.body.sceneId).toBe(sceneId);
  });

  it('POST /api/v1/projects/:id/cancel - cancels generation', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/cancel`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(res.body.projectId).toBe(projectId);
  });

  it('Tenant Isolation - User B cannot trigger generation on User A project (404 Not Found)', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/generate`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(404);
  });
});
