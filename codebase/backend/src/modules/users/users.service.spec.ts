import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UserRole, UserStatus } from './schemas/user.schema';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByVerificationToken: jest.fn(),
      findByPasswordResetToken: jest.fn(),
      update: jest.fn(),
      updateRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    service = new UsersService(repository);
  });

  it('should find user by id or throw NotFoundException', async () => {
    const mockUser = { _id: '123', email: 'test@example.com' };
    repository.findById.mockResolvedValue(mockUser as never);

    const result = await service.findById('123');
    expect(result).toBe(mockUser);

    repository.findById.mockResolvedValue(null);
    await expect(service.findById('456')).rejects.toThrow(NotFoundException);
  });

  it('should find user by email', async () => {
    const mockUser = { _id: '123', email: 'test@example.com' };
    repository.findByEmail.mockResolvedValue(mockUser as never);

    const result = await service.findByEmail('test@example.com');
    expect(result).toBe(mockUser);
  });

  it('should create new user', async () => {
    const newUserData = {
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed',
    };
    const created = { ...newUserData, _id: '123', role: UserRole.USER, status: UserStatus.ACTIVE };
    repository.create.mockResolvedValue(created as never);

    const result = await service.create(newUserData);
    expect(result).toBe(created);
    expect(repository.create).toHaveBeenCalledWith(newUserData);
  });

  it('should update user or throw NotFoundException', async () => {
    const updated = { _id: '123', name: 'Updated Name' };
    repository.update.mockResolvedValue(updated as never);

    const result = await service.update('123', { name: 'Updated Name' });
    expect(result).toBe(updated);

    repository.update.mockResolvedValue(null);
    await expect(service.update('456', { name: 'None' })).rejects.toThrow(NotFoundException);
  });
});

