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
import { S3StorageService } from '../src/modules/media/services/s3-storage.service';
import { MediaRepository } from '../src/modules/media/media.repository';
import { AssetType } from '../src/modules/media/schemas/media-asset.schema';

describe('Media Delivery (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const userAId = new Types.ObjectId().toString();
  const userBId = new Types.ObjectId().toString();
  let userAToken: string;
  let userBToken: string;

  const projectId = new Types.ObjectId().toString();

  const mockProject = {
    _id: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userAId),
    title: 'Neon Cyberpunk Race',
    prompt: 'Flying cars in neon rain',
    targetDurationSeconds: 15,
    aspectRatio: AspectRatio.LANDSCAPE,
    language: 'en',
    style: 'cinematic',
    status: ProjectStatus.COMPLETED,
    providerId: 'mock',
    providerConnectionId: null,
    modelId: 'mock-model',
    totalDurationSeconds: 15,
    scenesCount: 3,
    scriptApproved: true,
    finalVideoUrl: `https://test-bucket.s3.us-east-1.amazonaws.com/users/${userAId}/projects/${projectId}/final/render.mp4`,
    thumbnailUrl: `https://test-bucket.s3.us-east-1.amazonaws.com/users/${userAId}/projects/${projectId}/final/thumbnail.jpg`,
    errorMessage: '',
    createdAt: new Date(),
  };

  const mockProjectsRepository = {
    findByIdAndUser: jest.fn().mockImplementation((pId: string, uId: string) => {
      if (pId === projectId && uId === userAId) return Promise.resolve(mockProject);
      return Promise.resolve(null);
    }),
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

  const mockS3Storage = {
    buildFinalVideoKey: jest.fn().mockImplementation((uId: string, pId: string) => {
      return `users/${uId}/projects/${pId}/final/render.mp4`;
    }),
    generatePresignedGetUrl: jest.fn().mockImplementation((key: string, exp: number, file?: string) => {
      return Promise.resolve(`https://presigned.s3.amazonaws.com/${key}?X-Amz-Expires=${exp}${file ? `&response-content-disposition=attachment%3Bfilename%3D${file}` : ''}`);
    }),
  };

  const mockMediaRepository = {
    findByProject: jest.fn().mockImplementation((pId: string, uId: string) => {
      if (pId === projectId && uId === userAId) {
        return Promise.resolve([
          {
            _id: new Types.ObjectId(),
            projectId: new Types.ObjectId(projectId),
            userId: new Types.ObjectId(userAId),
            assetType: AssetType.FINAL_RENDER,
            storageKey: `users/${userAId}/projects/${projectId}/final/render.mp4`,
            cdnUrl: `https://s3.amazonaws.com/users/${userAId}/projects/${projectId}/final/render.mp4`,
            fileSizeBytes: 10485760,
            mimeType: 'video/mp4',
            metadata: { durationSeconds: 15, resolution: '1280x720', codec: 'h264' },
          },
          {
            _id: new Types.ObjectId(),
            projectId: new Types.ObjectId(projectId),
            userId: new Types.ObjectId(userAId),
            assetType: AssetType.THUMBNAIL,
            storageKey: `users/${userAId}/projects/${projectId}/final/thumbnail.jpg`,
            cdnUrl: `https://s3.amazonaws.com/users/${userAId}/projects/${projectId}/final/thumbnail.jpg`,
            fileSizeBytes: 204800,
            mimeType: 'image/jpeg',
            metadata: { width: 1280, height: 720 },
          },
        ]);
      }
      return Promise.resolve([]);
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
      .overrideProvider(S3StorageService)
      .useValue(mockS3Storage)
      .overrideProvider(MediaRepository)
      .useValue(mockMediaRepository)
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

  describe('GET /api/v1/projects/:id/download-url', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/download-url`)
        .expect(401);
    });

    it('enforces tenant isolation and returns 404 when User B requests User A project', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/download-url`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);
    });

    it('generates a presigned download URL for the project owner', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/download-url`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.downloadUrl).toContain('render.mp4');
      expect(res.body.downloadUrl).toContain('X-Amz-Expires=3600');
      expect(res.body.expiresInSeconds).toBe(3600);
      expect(res.body.fileName).toBe('neon_cyberpunk_race.mp4');
    });
  });

  describe('GET /api/v1/projects/:id/preview-url', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/preview-url`)
        .expect(401);
    });

    it('enforces tenant isolation and returns 404 for another user', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/preview-url`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);
    });

    it('generates presigned preview and thumbnail URLs for the project owner', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/preview-url`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.previewUrl).toContain('render.mp4');
      expect(res.body.thumbnailUrl).toContain('thumbnail.jpg');
      expect(res.body.expiresInSeconds).toBe(7200);
    });
  });

  describe('GET /api/v1/projects/:id/assets', () => {
    it('returns media assets for the project owner', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/assets`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0].assetType).toBe(AssetType.FINAL_RENDER);
      expect(res.body[1].assetType).toBe(AssetType.THUMBNAIL);
    });

    it('enforces tenant isolation and returns 404 for user who does not own the project', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/assets`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);
    });
  });
});
