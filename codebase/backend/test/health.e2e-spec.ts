import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { HealthModule } from '../src/health/health.module';
import { DatabaseHealthIndicator } from '../src/database/database-health.indicator';
import configuration from '../src/config/configuration';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockDbHealthIndicator = {
      isHealthy: jest.fn().mockResolvedValue({ mongodb: { status: 'up' } }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        HealthModule,
      ],
    })
      .overrideProvider(DatabaseHealthIndicator)
      .useValue(mockDbHealthIndicator)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health/live (GET) should return 200 OK', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect((res: request.Response) => {
        expect(res.body.status).toBe('ok');
        expect(typeof res.body.uptime).toBe('number');
        expect(res.body.timestamp).toBeDefined();
      });
  });

  it('/health/ready (GET) should return 200 OK when healthy', () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect((res: request.Response) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.details).toBeDefined();
      });
  });
});
