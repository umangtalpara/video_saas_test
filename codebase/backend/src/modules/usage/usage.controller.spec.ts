import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

describe('UsageController', () => {
  let controller: UsageController;
  let mockUsageService: Partial<UsageService>;

  const userId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockUsageService = {
      getUsageSummary: jest.fn().mockResolvedValue({
        jobsToday: 3,
        jobsThisMonth: 15,
        dailyLimit: 25,
        monthlyLimit: 250,
        totalCostUsd: 1.25,
        blockPaidProviders: true,
        providerBreakdown: [],
      }),
      getEffectiveLimits: jest.fn().mockResolvedValue({
        dailyJobCap: 25,
        monthlyJobCap: 250,
        maxCostPerProjectUsd: 10,
        blockPaidProviders: true,
        allowedProviders: [],
      }),
      updateLimits: jest.fn().mockImplementation((uId, dto) => Promise.resolve({ userId: uId, ...dto })),
      getUserLogs: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsageController],
      providers: [{ provide: UsageService, useValue: mockUsageService }],
    }).compile();

    controller = module.get<UsageController>(UsageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getSummary should return user usage summary', async () => {
    const res = await controller.getSummary(userId);
    expect(res.jobsToday).toBe(3);
    expect(res.dailyLimit).toBe(25);
  });

  it('getLimits should return effective limits', async () => {
    const res = await controller.getLimits(userId);
    expect(res.dailyJobCap).toBe(25);
    expect(res.blockPaidProviders).toBe(true);
  });

  it('updateLimits should call update with dto', async () => {
    const res = await controller.updateLimits(userId, { dailyJobCap: 50 });
    expect(mockUsageService.updateLimits).toHaveBeenCalledWith(userId, { dailyJobCap: 50 });
    expect(res.dailyJobCap).toBe(50);
  });

  it('getLogs should parse pagination params', async () => {
    await controller.getLogs(userId, '10', '20');
    expect(mockUsageService.getUserLogs).toHaveBeenCalledWith(userId, 10, 20);
  });
});

