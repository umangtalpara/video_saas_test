import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Request } from 'express';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserStatus } from '../users/schemas/user.schema';

describe('AdminController', () => {
  let controller: AdminController;
  let mockAdminService: Partial<AdminService>;

  const adminId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockAdminService = {
      getDashboard: jest.fn().mockResolvedValue({ stats: {}, providers: [] }),
      getUsers: jest.fn().mockResolvedValue({ users: [], total: 0 }),
      updateUserStatus: jest.fn().mockResolvedValue({ _id: userId, status: UserStatus.SUSPENDED }),
      getProviders: jest.fn().mockResolvedValue([]),
      toggleProviderKillswitch: jest.fn().mockResolvedValue({ providerId: 'wan', isEnabled: false }),
      getJobs: jest.fn().mockResolvedValue({ jobs: [], total: 0 }),
      getAuditLogs: jest.fn().mockResolvedValue({ logs: [], total: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getDashboard should call adminService.getDashboard', async () => {
    await controller.getDashboard();
    expect(mockAdminService.getDashboard).toHaveBeenCalled();
  });

  it('getUsers should pass pagination and filter query params', async () => {
    await controller.getUsers('10', '20', UserStatus.ACTIVE);
    expect(mockAdminService.getUsers).toHaveBeenCalledWith(10, 20, UserStatus.ACTIVE);
  });

  it('updateUserStatus should call adminService.updateUserStatus with IP address', async () => {
    const mockReq = { ip: '192.168.1.1' } as unknown as Request;
    await controller.updateUserStatus(
      userId,
      { status: UserStatus.SUSPENDED },
      adminId,
      'admin@example.com',
      mockReq,
    );

    expect(mockAdminService.updateUserStatus).toHaveBeenCalledWith(
      adminId,
      'admin@example.com',
      userId,
      UserStatus.SUSPENDED,
      '192.168.1.1',
    );
  });

  it('toggleProviderKillswitch should toggle killswitch', async () => {
    const mockReq = { ip: '127.0.0.1' } as unknown as Request;
    await controller.toggleProviderKillswitch(
      'wan',
      { isEnabled: false, reason: 'Spike' },
      adminId,
      'admin@example.com',
      mockReq,
    );

    expect(mockAdminService.toggleProviderKillswitch).toHaveBeenCalledWith(
      adminId,
      'admin@example.com',
      'wan',
      false,
      'Spike',
      '127.0.0.1',
    );
  });
});
