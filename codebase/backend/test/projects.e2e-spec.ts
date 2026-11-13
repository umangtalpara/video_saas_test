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
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../src/modules/users/users.service';
import { UserRole, UserStatus } from '../src/modules/users/schemas/user.schema';
import { ProjectsRepository } from '../src/modules/projects/projects.repository';
import {
  AspectRatio,
  ProjectStatus,
} from '../src/modules/projects/schemas/project.schema';
import { SceneStatus } from '../src/modules/projects/schemas/scene.schema';

describe('ProjectsController & ScriptPlanner (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const userAId = new Types.ObjectId().toString();
  const userBId = new Types.ObjectId().toString();
  let userAToken: string;
  let userBToken: string;

  interface MockDbProject {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    title: string;
    prompt: string;
    targetDurationSeconds: number;
    aspectRatio: AspectRatio;
    language: string;
    style: string;
    status: ProjectStatus;
    providerId: string;
    providerConnectionId: Types.ObjectId | null;
    modelId: string;
    totalDurationSeconds: number;
    scenesCount: number;
    scriptApproved: boolean;
    finalVideoUrl: string | null;
    thumbnailUrl: string | null;
    errorMessage: string;
    createdAt: Date;
  }

  interface MockDbScene {
    _id: Types.ObjectId;
    projectId: Types.ObjectId;
    userId: Types.ObjectId;
    sceneNumber: number;
    narration: string;
    visualPrompt: string;
    negativePrompt: string;
    plannedDurationSeconds: number;
    providerId: string;
    modelId: string;
    generationMode: string;
    continuityNotes: string;
    transition: string;
    status: SceneStatus;
    videoAssetUrl: string | null;
    thumbnailUrl: string | null;
    actualDurationSeconds: number;
    resolution: string;
    errorMessage: string;
    createdAt: Date;
  }

  const mockDbProjects: MockDbProject[] = [];
  const mockDbScenes: MockDbScene[] = [];

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

  const mockProjectsRepo = {
    findAllForUser: jest.fn().mockImplementation((userId: string) => {
      const uId = new Types.ObjectId(userId);
      return Promise.resolve(mockDbProjects.filter((p) => p.userId.equals(uId)));
    }),
    countForUser: jest.fn().mockImplementation((userId: string) => {
      const uId = new Types.ObjectId(userId);
      return Promise.resolve(
        mockDbProjects.filter((p) => p.userId.equals(uId)).length,
      );
    }),
    findByIdAndUser: jest.fn().mockImplementation((id: string, userId: string) => {
      const pId = new Types.ObjectId(id);
      const uId = new Types.ObjectId(userId);
      const found = mockDbProjects.find(
        (p) => p._id.equals(pId) && p.userId.equals(uId),
      );
      return Promise.resolve(found ? { ...found } : null);
    }),
    create: jest.fn().mockImplementation((data: Record<string, unknown>) => {
      const created: MockDbProject = {
        _id: new Types.ObjectId(),
        userId: data['userId'] as Types.ObjectId,
        title: (data['title'] as string) || 'Untitled',
        prompt: data['prompt'] as string,
        targetDurationSeconds: (data['targetDurationSeconds'] as number) || 30,
        aspectRatio: (data['aspectRatio'] as AspectRatio) || AspectRatio.PORTRAIT,
        language: (data['language'] as string) || 'en',
        style: (data['style'] as string) || 'cinematic',
        status: (data['status'] as ProjectStatus) || ProjectStatus.DRAFT,
        providerId: (data['providerId'] as string) || 'runway',
        providerConnectionId:
          (data['providerConnectionId'] as Types.ObjectId | null) || null,
        modelId: (data['modelId'] as string) || 'gen-3-alpha-turbo',
        totalDurationSeconds: (data['totalDurationSeconds'] as number) || 0,
        scenesCount: (data['scenesCount'] as number) || 0,
        scriptApproved: (data['scriptApproved'] as boolean) || false,
        finalVideoUrl: null,
        thumbnailUrl: null,
        errorMessage: '',
        createdAt: new Date(),
      };
      mockDbProjects.push(created);
      return Promise.resolve(created);
    }),
    updateByIdAndUser: jest
      .fn()
      .mockImplementation(
        (id: string, userId: string, update: Record<string, unknown>) => {
          const pId = new Types.ObjectId(id);
          const uId = new Types.ObjectId(userId);
          const idx = mockDbProjects.findIndex(
            (p) => p._id.equals(pId) && p.userId.equals(uId),
          );
          if (idx === -1) return Promise.resolve(null);
          const updated = { ...mockDbProjects[idx]!, ...update };
          mockDbProjects[idx] = updated;
          return Promise.resolve(updated);
        },
      ),
    deleteByIdAndUser: jest.fn().mockImplementation((id: string, userId: string) => {
      const pId = new Types.ObjectId(id);
      const uId = new Types.ObjectId(userId);
      const idx = mockDbProjects.findIndex(
        (p) => p._id.equals(pId) && p.userId.equals(uId),
      );
      if (idx === -1) return Promise.resolve(false);
      mockDbProjects.splice(idx, 1);
      return Promise.resolve(true);
    }),
    findScenesForProject: jest.fn().mockImplementation((projectId: string) => {
      const pId = new Types.ObjectId(projectId);
      return Promise.resolve(
        mockDbScenes.filter((s) => s.projectId.equals(pId)),
      );
    }),
    replaceScenesForProject: jest
      .fn()
      .mockImplementation(
        (projectId: string, scenes: Array<Record<string, unknown>>) => {
          const pId = new Types.ObjectId(projectId);
          for (let i = mockDbScenes.length - 1; i >= 0; i--) {
            if (mockDbScenes[i]?.projectId.equals(pId)) {
              mockDbScenes.splice(i, 1);
            }
          }
          const createdList = scenes.map((s, idx) => ({
            _id: new Types.ObjectId(),
            projectId: pId,
            userId: (s['userId'] as Types.ObjectId) || new Types.ObjectId(userAId),
            sceneNumber: (s['sceneNumber'] as number) || idx + 1,
            narration: (s['narration'] as string) || '',
            visualPrompt: (s['visualPrompt'] as string) || '',
            negativePrompt: (s['negativePrompt'] as string) || '',
            plannedDurationSeconds: (s['plannedDurationSeconds'] as number) || 5,
            providerId: (s['providerId'] as string) || 'runway',
            modelId: (s['modelId'] as string) || 'gen-3-alpha-turbo',
            generationMode: 'text_to_video',
            continuityNotes: (s['continuityNotes'] as string) || '',
            transition: (s['transition'] as string) || 'none',
            status: SceneStatus.DRAFT,
            videoAssetUrl: null,
            thumbnailUrl: null,
            actualDurationSeconds: 0,
            resolution: '1080p',
            errorMessage: '',
            createdAt: new Date(),
          }));
          mockDbScenes.push(...createdList);
          return Promise.resolve(createdList);
        },
      ),
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
        ProjectsModule,
      ],
    })
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .overrideProvider(ProjectsRepository)
      .useValue(mockProjectsRepo)
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

  let createdProjectId: string;

  it('1. User A creates a new draft video project', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        prompt: 'Futuristic drone flight through neon clouds at sunset',
        targetDurationSeconds: 30,
        aspectRatio: '9:16',
        style: 'cinematic',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe(ProjectStatus.DRAFT);
    expect(res.body.targetDurationSeconds).toBe(30);
    createdProjectId = res.body.id;
  });

  it('2. Tenant isolation: User B cannot access User A project', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(404);
  });

  it('3. Generate script plan parses prompt into structured scenes and transitions to awaiting_approval', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${createdProjectId}/script/generate`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({})
      .expect(200);

    expect(res.body.status).toBe(ProjectStatus.AWAITING_APPROVAL);
    expect(res.body.scenes).toBeDefined();
    expect(res.body.scenes.length).toBe(6); // 30s / 5s
    expect(res.body.totalDurationSeconds).toBe(30);
    expect(res.body.scenes[0].visualPrompt).toContain('Futuristic drone flight');
  });

  it('4. User A edits planned scene prompts via PATCH', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/projects/${createdProjectId}/script`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        scenes: [
          {
            sceneNumber: 1,
            narration: 'Custom edited narration opening',
            visualPrompt: 'Modified camera tracking opening shot',
            plannedDurationSeconds: 5,
          },
          {
            sceneNumber: 2,
            narration: 'Second scene narration',
            visualPrompt: 'Flying close up shot',
            plannedDurationSeconds: 5,
          },
        ],
      })
      .expect(200);

    expect(res.body.scenes.length).toBe(2);
    expect(res.body.scenes[0].narration).toBe('Custom edited narration opening');
  });

  it('5. User A approves script plan and transitions project to QUEUED', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${createdProjectId}/script/approve`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(res.body.status).toBe(ProjectStatus.QUEUED);
    expect(res.body.scriptApproved).toBe(true);
  });

  it('6. Cannot re-approve an already queued project (State Machine Validation)', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${createdProjectId}/script/approve`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(400);
  });

  it('7. User A deletes project', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(mockDbProjects).toHaveLength(0);
  });
});

