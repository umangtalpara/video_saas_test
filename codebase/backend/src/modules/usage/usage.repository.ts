import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ProviderUsage,
  ProviderUsageDocument,
} from './schemas/provider-usage.schema';
import {
  UserLimits,
  UserLimitsDocument,
} from './schemas/user-limits.schema';

@Injectable()
export class UsageRepository {
  constructor(
    @InjectModel(ProviderUsage.name)
    private readonly usageModel: Model<ProviderUsageDocument>,
    @InjectModel(UserLimits.name)
    private readonly limitsModel: Model<UserLimitsDocument>,
  ) {}

  public async createUsage(data: Partial<ProviderUsage>): Promise<ProviderUsageDocument> {
    return this.usageModel.create(data);
  }

  public async findByUser(
    userId: string,
    limit: number = 50,
    skip: number = 0,
  ): Promise<ProviderUsageDocument[]> {
    return this.usageModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  public async countByUserAndPeriod(userId: string, since: Date): Promise<number> {
    return this.usageModel.countDocuments({
      userId: new Types.ObjectId(userId),
      createdAt: { $gte: since },
    });
  }

  public async sumCostByUserAndPeriod(
    userId: string,
    since: Date,
  ): Promise<number> {
    const results = await this.usageModel.aggregate<{ _id: null; totalCost: number }>([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$costEstimatedUsd' },
        },
      },
    ]);
    return results[0]?.totalCost || 0.0;
  }

  public async aggregateByUserAndProvider(userId: string): Promise<
    Array<{ providerId: string; totalUnits: number; totalCost: number; callCount: number }>
  > {
    return this.usageModel.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$providerId',
          totalUnits: { $sum: '$unitsConsumed' },
          totalCost: { $sum: '$costEstimatedUsd' },
          callCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          providerId: '$_id',
          totalUnits: 1,
          totalCost: 1,
          callCount: 1,
        },
      },
    ]);
  }

  public async getLimits(userId: string): Promise<UserLimitsDocument | null> {
    return this.limitsModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
  }

  public async upsertLimits(
    userId: string,
    update: Partial<UserLimits>,
  ): Promise<UserLimitsDocument> {
    return this.limitsModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: update },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec() as Promise<UserLimitsDocument>;
  }

  public async getAllRecentLogs(limit: number = 100): Promise<ProviderUsageDocument[]> {
    return this.usageModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}

