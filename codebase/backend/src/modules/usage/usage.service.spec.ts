import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsageService } from './usage.service';
import { UsageRepository } from './usage.repository';
import { UsageOperation, UsageStatus } from './schemas/provider-usage.schema';
import { AspectRatio, ProjectStatus, VideoProjectDocument } from '../projects/schemas/project.schema';

describe('UsageService', () => {
  let service: UsageService;
  let mockUsageRepo: Partial<UsageRepository>;

  const userId = new Types.ObjectId().toString();
  const projectId = new Types.ObjectId().toString();

  const mockLimits = {
    userId: new Types.ObjectId(userId),
    dailyJobCap: 10,
    monthlyJobCap: 100,
    maxCostPerProjectUsd: 5.0,
    blockPaidProviders: true,
    allowedProviders: [],
  };

  const mockProject = {
    _id: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userId),
    title: 'Test Video',
    providerId: 'mock',
    modelId: 'mock-model',
    targetDurationSeconds: 10,
    aspectRatio: AspectRatio.LANDSCAPE,
    status: ProjectStatus.AWAITING_APPROVAL,
  } as unknown as VideoProjectDocument;

  beforeEach(async () => {
    mockUsageRepo = {
      createUsage: jest.fn().mockImplementation((data) => Promise.resolve({ _id: new Types.ObjectId(), ...data })),
      getLimits: jest.fn().mockResolvedValue(mockLimits),
      upsertLimits: jest.fn().mockImplementation((uId, update) => Promise.resolve({ ...mockLimits, ...update })),
      countByUserAndPeriod: jest.fn().mockResolvedValue(2),
      sumCostByUserAndPeriod: jest.fn().mockResolvedValue(0.15),
      aggregateByUserAndProvider: jest.fn().mockResolvedValue([
        { providerId: 'mock', totalUnits: 20, totalCost: 0, callCount: 2 },
      ]),
      findByUser: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageService,
        { provide: UsageRepository, useValue: mockUsageRepo },
      ],
    }).compile();

    service = module.get<UsageService>(UsageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('estimateCost', () => {
    it('estimates zero cost for mock and free providers', () => {
      const res = service.estimateCost('mock', 10);
      expect(res.costUsd).toBe(0.0);
      expect(res.isPaid).toBe(false);
    });

    it('estimates paid cost for runway provider', () => {
      const res = service.estimateCost('runway', 10);
      expect(res.costUsd).toBe(0.5);
      expect(res.isPaid).toBe(true);
    });
  });

  describe('recordProviderCall', () => {
    it('creates usage record with estimated cost', async () => {
      const res = await service.recordProviderCall({
        userId,
        projectId,
        providerId: 'runway',
        modelId: 'gen3-alpha',
        operation: UsageOperation.VIDEO_GENERATION,
        status: UsageStatus.SUCCESS,
        unitsConsumed: 10,
        durationSeconds: 10,
      });

      expect(mockUsageRepo.createUsage).toHaveBeenCalled();
      expect(res.costEstimatedUsd).toBe(0.5);
      expect(res.isPaid).toBe(true);
    });
  });

  describe('getUsageSummary', () => {
    it('returns combined metrics, limits, and provider breakdowns', async () => {
      const summary = await service.getUsageSummary(userId);
      expect(summary.jobsToday).toBe(2);
      expect(summary.jobsThisMonth).toBe(2);
      expect(summary.dailyLimit).toBe(10);
      expect(summary.monthlyLimit).toBe(100);
      expect(summary.blockPaidProviders).toBe(true);
      expect(summary.providerBreakdown.length).toBe(1);
    });
  });

  describe('validateGenerationEligibility', () => {
    it('permits valid generation within limits', async () => {
      await expect(service.validateGenerationEligibility(userId, mockProject)).resolves.not.toThrow();
    });

    it('blocks paid provider if blockPaidProviders is enabled', async () => {
      const paidProject = {
        ...mockProject,
        providerId: 'runway',
      } as unknown as VideoProjectDocument;

      await expect(service.validateGenerationEligibility(userId, paidProject)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('blocks generation if provider is not in whitelist', async () => {
      (mockUsageRepo.getLimits as jest.Mock).mockResolvedValueOnce({
        ...mockLimits,
        allowedProviders: ['wan'],
      });

      await expect(service.validateGenerationEligibility(userId, mockProject)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('blocks generation if daily limit is reached', async () => {
      (mockUsageRepo.countByUserAndPeriod as jest.Mock).mockResolvedValueOnce(10); // 10 >= 10

      await expect(service.validateGenerationEligibility(userId, mockProject)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('blocks generation if project cost exceeds max cost cap', async () => {
      const expensiveProject = {
        ...mockProject,
        providerId: 'runway',
        targetDurationSeconds: 120, // 120 * 0.05 = 6.0 > 5.0
      } as unknown as VideoProjectDocument;

      (mockUsageRepo.getLimits as jest.Mock).mockResolvedValueOnce({
        ...mockLimits,
        blockPaidProviders: false,
        maxCostPerProjectUsd: 5.0,
      });

      await expect(service.validateGenerationEligibility(userId, expensiveProject)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

