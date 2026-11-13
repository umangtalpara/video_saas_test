import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckResult, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from '../database/database-health.indicator';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<HealthCheckService>;
  let memoryIndicator: jest.Mocked<MemoryHealthIndicator>;
  let dbIndicator: jest.Mocked<DatabaseHealthIndicator>;

  beforeEach(async () => {
    const mockHealthService = {
      check: jest.fn(),
    };
    const mockMemoryIndicator = {
      checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
    };
    const mockDbIndicator = {
      isHealthy: jest.fn().mockResolvedValue({ mongodb: { status: 'up' } }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthService },
        { provide: MemoryHealthIndicator, useValue: mockMemoryIndicator },
        { provide: DatabaseHealthIndicator, useValue: mockDbIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get(HealthCheckService);
    memoryIndicator = module.get(MemoryHealthIndicator);
    dbIndicator = module.get(DatabaseHealthIndicator);
  });

  describe('getLive', () => {
    it('should return status ok with uptime and timestamp', () => {
      const result = controller.getLive();

      expect(result.status).toBe('ok');
      expect(typeof result.uptime).toBe('number');
      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('getReady', () => {
    it('should perform checks on memory and database', async () => {
      const expectedResult: HealthCheckResult = {
        status: 'ok',
        info: {
          memory_heap: { status: 'up' },
          mongodb: { status: 'up' },
        },
        error: {},
        details: {
          memory_heap: { status: 'up' },
          mongodb: { status: 'up' },
        },
      };

      healthService.check.mockResolvedValue(expectedResult);

      const result = await controller.getReady();

      expect(healthService.check).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });
});
