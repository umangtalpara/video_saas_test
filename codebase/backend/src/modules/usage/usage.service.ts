import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { UsageRepository } from './usage.repository';
import {
  ProviderUsageDocument,
  UsageOperation,
  UsageStatus,
} from './schemas/provider-usage.schema';
import { UserLimitsDocument } from './schemas/user-limits.schema';
import { UpdateLimitsDto } from './dto/update-limits.dto';
import { VideoProjectDocument } from '../projects/schemas/project.schema';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly usageRepo: UsageRepository) {}

  public estimateCost(providerId: string, durationSeconds: number = 5): { costUsd: number; isPaid: boolean } {
    if (providerId === 'runway') {
      return { costUsd: Number((durationSeconds * 0.05).toFixed(3)), isPaid: true };
    }
    if (providerId === 'wan') {
      return { costUsd: Number((durationSeconds * 0.02).toFixed(3)), isPaid: false };
    }
    return { costUsd: 0.0, isPaid: false };
  }

  public async recordProviderCall(params: {
    userId: string;
    projectId?: string;
    sceneId?: string;
    providerId: string;
    modelId: string;
    operation: UsageOperation;
    status: UsageStatus;
    unitsConsumed: number;
    durationSeconds: number;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ProviderUsageDocument> {
    const { costUsd, isPaid } = this.estimateCost(params.providerId, params.durationSeconds);

    return this.usageRepo.createUsage({
      userId: new Types.ObjectId(params.userId),
      projectId: params.projectId ? new Types.ObjectId(params.projectId) : null,
      sceneId: params.sceneId ? new Types.ObjectId(params.sceneId) : null,
      providerId: params.providerId,
      modelId: params.modelId,
      operation: params.operation,
      status: params.status,
      unitsConsumed: params.unitsConsumed,
      durationSeconds: params.durationSeconds,
      costEstimatedUsd: costUsd,
      isPaid,
      errorMessage: params.errorMessage || null,
      metadata: params.metadata || {},
    });
  }

  public async getEffectiveLimits(userId: string): Promise<UserLimitsDocument> {
    let limits = await this.usageRepo.getLimits(userId);
    if (!limits) {
      limits = await this.usageRepo.upsertLimits(userId, {
        dailyJobCap: 25,
        monthlyJobCap: 250,
        maxCostPerProjectUsd: 10.0,
        blockPaidProviders: true,
        allowedProviders: [],
      });
    }
    return limits;
  }

  public async updateLimits(userId: string, dto: UpdateLimitsDto): Promise<UserLimitsDocument> {
    return this.usageRepo.upsertLimits(userId, dto);
  }

  public async getUsageSummary(userId: string): Promise<{
    jobsToday: number;
    jobsThisMonth: number;
    dailyLimit: number;
    monthlyLimit: number;
    totalCostUsd: number;
    blockPaidProviders: boolean;
    providerBreakdown: Array<{ providerId: string; totalUnits: number; totalCost: number; callCount: number }>;
  }> {
    const limits = await this.getEffectiveLimits(userId);

    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [jobsToday, jobsThisMonth, totalCostUsd, providerBreakdown] = await Promise.all([
      this.usageRepo.countByUserAndPeriod(userId, startOfDay),
      this.usageRepo.countByUserAndPeriod(userId, startOfMonth),
      this.usageRepo.sumCostByUserAndPeriod(userId, startOfMonth),
      this.usageRepo.aggregateByUserAndProvider(userId),
    ]);

    return {
      jobsToday,
      jobsThisMonth,
      dailyLimit: limits.dailyJobCap,
      monthlyLimit: limits.monthlyJobCap,
      totalCostUsd: Number(totalCostUsd.toFixed(2)),
      blockPaidProviders: limits.blockPaidProviders,
      providerBreakdown,
    };
  }

  public async validateGenerationEligibility(
    userId: string,
    project: VideoProjectDocument,
  ): Promise<void> {
    const limits = await this.getEffectiveLimits(userId);
    const providerId = project.providerId || 'mock';

    // 1. Check Paid Provider Block
    const { costUsd, isPaid } = this.estimateCost(providerId, project.targetDurationSeconds || 10);
    if (isPaid && limits.blockPaidProviders) {
      throw new ForbiddenException(
        `Provider "${providerId}" requires paid credits. Generation is blocked by strict free-only setting.`,
      );
    }

    // 2. Check Allowed Providers whitelist
    if (limits.allowedProviders && limits.allowedProviders.length > 0) {
      if (!limits.allowedProviders.includes(providerId)) {
        throw new ForbiddenException(`Provider "${providerId}" is not in your allowed providers list.`);
      }
    }

    // 3. Check Cost ceiling
    if (costUsd > limits.maxCostPerProjectUsd) {
      throw new BadRequestException(
        `Estimated project cost ($${costUsd.toFixed(2)}) exceeds maximum allowed project limit ($${limits.maxCostPerProjectUsd.toFixed(2)}).`,
      );
    }

    // 4. Check Daily Cap
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const jobsToday = await this.usageRepo.countByUserAndPeriod(userId, startOfDay);
    if (jobsToday >= limits.dailyJobCap) {
      throw new ForbiddenException(
        `Daily generation limit reached (${jobsToday}/${limits.dailyJobCap} jobs). Resets at midnight UTC.`,
      );
    }

    // 5. Check Monthly Cap
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const jobsThisMonth = await this.usageRepo.countByUserAndPeriod(userId, startOfMonth);
    if (jobsThisMonth >= limits.monthlyJobCap) {
      throw new ForbiddenException(
        `Monthly generation limit reached (${jobsThisMonth}/${limits.monthlyJobCap} jobs).`,
      );
    }
  }

  public async getUserLogs(userId: string, limit: number = 50, skip: number = 0): Promise<ProviderUsageDocument[]> {
    return this.usageRepo.findByUser(userId, limit, skip);
  }
}

