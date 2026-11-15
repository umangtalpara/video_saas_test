import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { ProvidersRepository } from '../providers/providers.repository';
import { UserRole, UserStatus } from '../users/schemas/user.schema';
import { BillingClassification } from '../providers/schemas/provider.schema';

describe('AdminService', () => {
  let service: AdminService;
  let mockAdminRepo: Partial<AdminRepository>;
  let mockProvidersRepo: Partial<ProvidersRepository>;

  const adminId = new Types.ObjectId().toString();
  const targetUserId = new Types.ObjectId().toString();

  const mockUser = {
    _id: new Types.ObjectId(targetUserId),
    name: 'Target User',
    email: 'target@example.com',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
  };

  const mockProvider = {
    providerId: 'wan',
    displayName: 'Wan 2.1 Video',
    isEnabled: true,
    billingClassification: BillingClassification.FREE_VERIFIED,
  };

  beforeEach(async () => {
    mockAdminRepo = {
      getDashboardStats: jest.fn().mockResolvedValue({
        totalUsers: 50,
        activeUsers: 48,
        suspendedUsers: 2,
        totalProjects: 120,
        completedProjects: 110,
        failedProjects: 5,
        renderingProjects: 5,
        totalProviderCalls: 350,
        estimatedCostUsd: 12.5,
      }),
      findAllUsers: jest.fn().mockResolvedValue([mockUser]),
      countUsers: jest.fn().mockResolvedValue(1),
      updateUserStatus: jest.fn().mockImplementation((id, status) => {
        if (id === targetUserId) {
          return Promise.resolve({ ...mockUser, status });
        }
        return Promise.resolve(null);
      }),
      createAuditLog: jest.fn().mockResolvedValue({}),
      findRecentJobs: jest.fn().mockResolvedValue([]),
      countJobs: jest.fn().mockResolvedValue(0),
      findAuditLogs: jest.fn().mockResolvedValue([]),
      countAuditLogs: jest.fn().mockResolvedValue(0),
    };

    mockProvidersRepo = {
      findAllProviders: jest.fn().mockResolvedValue([mockProvider]),
      findProviderById: jest.fn().mockImplementation((id) => {
        if (id === 'wan') return Promise.resolve(mockProvider);
        return Promise.resolve(null);
      }),
      updateProvider: jest.fn().mockImplementation((id, dto) => {
        return Promise.resolve({ ...mockProvider, ...dto });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AdminRepository, useValue: mockAdminRepo },
        { provide: ProvidersRepository, useValue: mockProvidersRepo },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboard', () => {
    it('returns combined dashboard statistics and provider overview', async () => {
      const res = await service.getDashboard();
      expect(res.stats.totalUsers).toBe(50);
      expect(res.providers.length).toBe(1);
      expect(res.providers[0]?.providerId).toBe('wan');
    });
  });

  describe('updateUserStatus', () => {
    it('updates user status and logs audit event', async () => {
      const res = await service.updateUserStatus(
        adminId,
        'admin@example.com',
        targetUserId,
        UserStatus.SUSPENDED,
      );

      expect(res.status).toBe(UserStatus.SUSPENDED);
      expect(mockAdminRepo.createAuditLog).toHaveBeenCalled();
    });

    it('rejects self-suspension by administrator', async () => {
      await expect(
        service.updateUserStatus(adminId, 'admin@example.com', adminId, UserStatus.SUSPENDED),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for non-existent user', async () => {
      await expect(
        service.updateUserStatus(adminId, 'admin@example.com', 'non-existent', UserStatus.SUSPENDED),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleProviderKillswitch', () => {
    it('toggles provider isEnabled and writes audit log', async () => {
      const res = await service.toggleProviderKillswitch(
        adminId,
        'admin@example.com',
        'wan',
        false,
        'Emergency spike mitigation',
      );

      expect(res?.isEnabled).toBe(false);
      expect(mockAdminRepo.createAuditLog).toHaveBeenCalled();
    });

    it('throws NotFoundException for unknown provider', async () => {
      await expect(
        service.toggleProviderKillswitch(
          adminId,
          'admin@example.com',
          'unknown-provider',
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
