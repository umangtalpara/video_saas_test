import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsageLimitsGuard } from './usage-limits.guard';
import { UsageService } from '../usage.service';
import { ProjectsRepository } from '../../projects/projects.repository';

describe('UsageLimitsGuard', () => {
  let guard: UsageLimitsGuard;
  let mockUsageService: Partial<UsageService>;
  let mockProjectsRepo: Partial<ProjectsRepository>;

  const userId = new Types.ObjectId().toString();
  const projectId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockUsageService = {
      validateGenerationEligibility: jest.fn().mockResolvedValue(undefined),
    };

    mockProjectsRepo = {
      findByIdAndUser: jest.fn().mockImplementation((pId, uId) => {
        if (pId === projectId && uId === userId) {
          return Promise.resolve({ _id: new Types.ObjectId(projectId), userId: new Types.ObjectId(userId) });
        }
        return Promise.resolve(null);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageLimitsGuard,
        { provide: UsageService, useValue: mockUsageService },
        { provide: ProjectsRepository, useValue: mockProjectsRepo },
      ],
    }).compile();

    guard = module.get<UsageLimitsGuard>(UsageLimitsGuard);
  });

  const createMockContext = (req: Record<string, unknown>): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  };

  it('allows through when no user or projectId present', async () => {
    const ctx = createMockContext({});
    const res = await guard.canActivate(ctx);
    expect(res).toBe(true);
  });

  it('throws NotFoundException when project is not found', async () => {
    const ctx = createMockContext({ user: { sub: userId }, params: { id: 'non-existent' } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
  });

  it('calls validateGenerationEligibility and allows valid project', async () => {
    const ctx = createMockContext({ user: { sub: userId }, params: { id: projectId } });
    const res = await guard.canActivate(ctx);
    expect(res).toBe(true);
    expect(mockUsageService.validateGenerationEligibility).toHaveBeenCalled();
  });
});

