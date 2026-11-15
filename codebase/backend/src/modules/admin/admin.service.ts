import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminRepository } from './admin.repository';
import { ProvidersRepository } from '../providers/providers.repository';
import { UserStatus } from '../users/schemas/user.schema';
import { ProjectStatus } from '../projects/schemas/project.schema';
import { AuditAction } from './schemas/audit-log.schema';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly providersRepo: ProvidersRepository,
  ) {}

  public async getDashboard() {
    const [stats, providers] = await Promise.all([
      this.adminRepo.getDashboardStats(),
      this.providersRepo.findAllProviders(false),
    ]);

    return {
      stats,
      providers: providers.map((p) => ({
        providerId: p.providerId,
        displayName: p.displayName,
        isEnabled: p.isEnabled,
        billingClassification: p.billingClassification,
      })),
    };
  }

  public async getUsers(limit: number = 50, skip: number = 0, status?: UserStatus) {
    const [users, total] = await Promise.all([
      this.adminRepo.findAllUsers(limit, skip, status),
      this.adminRepo.countUsers(status),
    ]);
    return { users, total, limit, skip };
  }

  public async updateUserStatus(
    adminId: string,
    adminEmail: string,
    targetUserId: string,
    newStatus: UserStatus,
    ipAddress: string = '127.0.0.1',
  ) {
    if (adminId === targetUserId) {
      throw new BadRequestException('Administrators cannot change their own status');
    }

    const updated = await this.adminRepo.updateUserStatus(targetUserId, newStatus);
    if (!updated) {
      throw new NotFoundException(`User '${targetUserId}' not found`);
    }

    await this.adminRepo.createAuditLog({
      adminUserId: new Types.ObjectId(adminId),
      adminEmail,
      action: AuditAction.USER_SUSPENSION_TOGGLE,
      targetType: 'user',
      targetId: targetUserId,
      details: { newStatus, userName: updated.name, userEmail: updated.email },
      ipAddress,
    });

    return updated;
  }

  public async getProviders() {
    return this.providersRepo.findAllProviders(false);
  }

  public async toggleProviderKillswitch(
    adminId: string,
    adminEmail: string,
    providerId: string,
    isEnabled: boolean,
    reason?: string,
    ipAddress: string = '127.0.0.1',
  ) {
    const provider = await this.providersRepo.findProviderById(providerId);
    if (!provider) {
      throw new NotFoundException(`Provider '${providerId}' not found`);
    }

    const updated = await this.providersRepo.updateProvider(providerId, { isEnabled });

    await this.adminRepo.createAuditLog({
      adminUserId: new Types.ObjectId(adminId),
      adminEmail,
      action: AuditAction.PROVIDER_KILLSWITCH_TOGGLE,
      targetType: 'provider',
      targetId: providerId,
      details: {
        previousState: provider.isEnabled,
        newState: isEnabled,
        reason: reason || 'Admin toggle',
      },
      ipAddress,
    });

    return updated;
  }

  public async getJobs(limit: number = 50, skip: number = 0, status?: ProjectStatus) {
    const [jobs, total] = await Promise.all([
      this.adminRepo.findRecentJobs(limit, skip, status),
      this.adminRepo.countJobs(status),
    ]);
    return { jobs, total, limit, skip };
  }

  public async getAuditLogs(limit: number = 50, skip: number = 0) {
    const [logs, total] = await Promise.all([
      this.adminRepo.findAuditLogs(limit, skip),
      this.adminRepo.countAuditLogs(),
    ]);
    return { logs, total, limit, skip };
  }
}
