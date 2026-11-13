import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProviderConnectionsService } from './provider-connections.service';
import { ProviderConnectionsRepository } from './provider-connections.repository';
import { ProvidersService } from '../providers/providers.service';
import { EncryptionService } from '../../common/services/encryption.service';
import {
  ConnectionStatus,
  ProviderConnectionDocument,
} from './schemas/provider-connection.schema';

describe('ProviderConnectionsService', () => {
  let service: ProviderConnectionsService;
  let repository: jest.Mocked<ProviderConnectionsRepository>;
  let encryptionService: jest.Mocked<EncryptionService>;
  let providersService: jest.Mocked<ProvidersService>;

  const userId = new Types.ObjectId().toString();
  const connectionId = new Types.ObjectId().toString();

  const mockConnection = {
    _id: { toString: () => connectionId },
    userId: new Types.ObjectId(userId),
    providerId: 'runway',
    displayName: 'My Runway Key',
    encryptedCredentials: {
      ciphertext: 'deadbeef',
      iv: '1234567890abcdef12345678',
      authTag: 'abcdef0123456789abcdef0123456789',
      keyVersion: 1,
    },
    maskedKey: 'sk-****cdef',
    region: 'global',
    customBaseUrl: '',
    status: ConnectionStatus.UNTESTED,
    lastTestedAt: null,
    lastSuccessAt: null,
    lastErrorCode: '',
    lastErrorMessage: '',
    dailyJobLimit: 50,
    monthlyJobLimit: 500,
    maxCostPerProject: 0,
    blockPaidOrUnknownProviders: false,
    isEnabled: true,
    createdAt: new Date(),
  } as unknown as ProviderConnectionDocument;

  beforeEach(async () => {
    const mockRepo = {
      findAllByUser: jest.fn().mockResolvedValue([mockConnection]),
      findByIdAndUser: jest.fn().mockResolvedValue(mockConnection),
      create: jest.fn().mockResolvedValue(mockConnection),
      updateByIdAndUser: jest.fn().mockResolvedValue(mockConnection),
      deleteByIdAndUser: jest.fn().mockResolvedValue(true),
    };

    const mockEncryption = {
      encrypt: jest.fn().mockReturnValue({
        ciphertext: 'deadbeef',
        iv: '1234567890abcdef12345678',
        authTag: 'abcdef0123456789abcdef0123456789',
        keyVersion: 1,
      }),
      decrypt: jest.fn().mockReturnValue('sk-runway-key-123456789'),
      maskKey: jest.fn().mockReturnValue('sk-****cdef'),
    };

    const mockProviders = {
      findProviderById: jest.fn().mockResolvedValue({ providerId: 'runway' } as never),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderConnectionsService,
        { provide: ProviderConnectionsRepository, useValue: mockRepo },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: ProvidersService, useValue: mockProviders },
      ],
    }).compile();

    service = module.get<ProviderConnectionsService>(ProviderConnectionsService);
    repository = module.get(ProviderConnectionsRepository);
    encryptionService = module.get(EncryptionService);
    providersService = module.get(ProvidersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllForUser', () => {
    it('returns connections with masked keys', async () => {
      const list = await service.findAllForUser(userId);
      expect(list).toHaveLength(1);
      expect(list[0]?.maskedKey).toBe('sk-****cdef');
      expect((list[0] as unknown as { encryptedCredentials?: unknown }).encryptedCredentials).toBeUndefined();
    });
  });

  describe('create', () => {
    it('validates provider, encrypts key, and stores connection', async () => {
      const result = await service.create(userId, {
        providerId: 'runway',
        displayName: 'My Runway Key',
        apiKey: 'sk-runway-key-123456789',
      });

      expect(providersService.findProviderById).toHaveBeenCalledWith('runway');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('sk-runway-key-123456789');
      expect(encryptionService.maskKey).toHaveBeenCalledWith('sk-runway-key-123456789');
      expect(result.displayName).toBe('My Runway Key');
    });
  });

  describe('testConnection', () => {
    it('decrypts key safely and updates status to VALID for working key', async () => {
      const result = await service.testConnection(connectionId, userId);
      expect(encryptionService.decrypt).toHaveBeenCalled();
      expect(result.isValid).toBe(true);
      expect(result.status).toBe(ConnectionStatus.VALID);
      expect(repository.updateByIdAndUser).toHaveBeenCalledWith(
        connectionId,
        userId,
        expect.objectContaining({ status: ConnectionStatus.VALID }),
      );
    });

    it('marks connection INVALID if key contains invalid string', async () => {
      encryptionService.decrypt.mockReturnValueOnce('sk-invalid-key');
      const result = await service.testConnection(connectionId, userId);
      expect(result.isValid).toBe(false);
      expect(result.status).toBe(ConnectionStatus.INVALID);
    });

    it('throws NotFoundException if connection does not belong to user', async () => {
      repository.findByIdAndUser.mockResolvedValueOnce(null);
      await expect(
        service.testConnection('wrong-id', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes connection successfully', async () => {
      const result = await service.delete(connectionId, userId);
      expect(result.message).toContain('deleted successfully');
    });

    it('throws NotFoundException when deletion target does not exist', async () => {
      repository.deleteByIdAndUser.mockResolvedValueOnce(false);
      await expect(service.delete('wrong-id', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

