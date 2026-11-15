import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { User, UserDocument, UserStatus } from '../users/schemas/user.schema';
import {
  ProjectStatus,
  VideoProject,
  VideoProjectDocument,
} from '../projects/schemas/project.schema';
import {
  ProviderUsage,
  ProviderUsageDocument,
} from '../usage/schemas/provider-usage.schema';

@Injectable()
export class AdminRepository {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(VideoProject.name)
    private readonly projectModel: Model<VideoProjectDocument>,
    @InjectModel(ProviderUsage.name)
    private readonly usageModel: Model<ProviderUsageDocument>,
  ) {}

  public async createAuditLog(data: Partial<AuditLog>): Promise<AuditLogDocument> {
    return this.auditLogModel.create(data);
  }

  public async findAuditLogs(limit: number = 50, skip: number = 0): Promise<AuditLogDocument[]> {
    return this.auditLogModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec();
  }

  public async countAuditLogs(): Promise<number> {
    return this.auditLogModel.countDocuments();
  }

  public async findAllUsers(
    limit: number = 50,
    skip: number = 0,
    status?: UserStatus,
  ): Promise<UserDocument[]> {
    const filter = status ? { status } : {};
    return this.userModel
      .find(filter)
      .select('-passwordHash -refreshTokenHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  public async countUsers(status?: UserStatus): Promise<number> {
    const filter = status ? { status } : {};
    return this.userModel.countDocuments(filter);
  }

  public async updateUserStatus(userId: string, status: UserStatus): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    return this.userModel
      .findByIdAndUpdate(userId, { $set: { status } }, { new: true })
      .select('-passwordHash -refreshTokenHash')
      .exec();
  }

  public async findRecentJobs(
    limit: number = 50,
    skip: number = 0,
    status?: ProjectStatus,
  ): Promise<VideoProjectDocument[]> {
    const filter = status ? { status } : {};
    return this.projectModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec();
  }

  public async countJobs(status?: ProjectStatus): Promise<number> {
    const filter = status ? { status } : {};
    return this.projectModel.countDocuments(filter);
  }

  public async getDashboardStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    totalProjects: number;
    completedProjects: number;
    failedProjects: number;
    renderingProjects: number;
    totalProviderCalls: number;
    estimatedCostUsd: number;
  }> {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalProjects,
      completedProjects,
      failedProjects,
      renderingProjects,
      totalProviderCalls,
      costAgg,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ status: UserStatus.ACTIVE }),
      this.userModel.countDocuments({ status: UserStatus.SUSPENDED }),
      this.projectModel.countDocuments(),
      this.projectModel.countDocuments({ status: ProjectStatus.COMPLETED }),
      this.projectModel.countDocuments({ status: ProjectStatus.FAILED }),
      this.projectModel.countDocuments({ status: ProjectStatus.RENDERING }),
      this.usageModel.countDocuments(),
      this.usageModel.aggregate<{ _id: null; total: number }>([
        { $group: { _id: null, total: { $sum: '$costEstimatedUsd' } } },
      ]),
    ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalProjects,
      completedProjects,
      failedProjects,
      renderingProjects,
      totalProviderCalls,
      estimatedCostUsd: Number((costAgg[0]?.total || 0).toFixed(2)),
    };
  }
}
