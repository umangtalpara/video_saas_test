import { Test, TestingModule } from '@nestjs/testing';
import { ProviderConnectionsController } from './provider-connections.controller';
import { ProviderConnectionsService } from './provider-connections.service';
import { ConnectionStatus } from './schemas/provider-connection.schema';
import { ProviderConnectionResponseDto } from './dto/provider-connection-response.dto';
import { TestConnectionResponseDto } from './dto/test-connection-response.dto';

describe('ProviderConnectionsController', () => {
  let controller: ProviderConnectionsController;
  let service: jest.Mocked<ProviderConnectionsService>;

  const userId = 'user-123';
  const connectionId = 'conn-456';

  const mockResponse: ProviderConnectionResponseDto = {
    id: connectionId,
    providerId: 'runway',
    displayName: 'My Runway Key',
    maskedKey: 'sk-****cdef',
    region: 'global',
    customBaseUrl: '',
    status: ConnectionStatus.VALID,
    lastTestedAt: new Date(),
    lastSuccessAt: null,
    lastErrorCode: '',
    lastErrorMessage: '',
    dailyJobLimit: 50,
    monthlyJobLimit: 500,
    maxCostPerProject: 0,
    blockPaidOrUnknownProviders: false,
    isEnabled: true,
    createdAt: new Date(),
  };

  const mockTestResponse: TestConnectionResponseDto = {
    connectionId,
    providerId: 'runway',
    status: ConnectionStatus.VALID,
    isValid: true,
    message: 'Active',
    latencyMs: 50,
    testedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      findAllForUser: jest.fn().mockResolvedValue([mockResponse]),
      findOneForUser: jest.fn().mockResolvedValue(mockResponse),
      create: jest.fn().mockResolvedValue(mockResponse),
      update: jest.fn().mockResolvedValue(mockResponse),
      delete: jest.fn().mockResolvedValue({ message: 'Deleted' }),
      testConnection: jest.fn().mockResolvedValue(mockTestResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProviderConnectionsController],
      providers: [
        { provide: ProviderConnectionsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<ProviderConnectionsController>(
      ProviderConnectionsController,
    );
    service = module.get(ProviderConnectionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConnections', () => {
    it('returns connections for current user', async () => {
      const result = await controller.getConnections(userId);
      expect(result).toHaveLength(1);
      expect(service.findAllForUser).toHaveBeenCalledWith(userId, false);
    });
  });

  describe('createConnection', () => {
    it('creates connection for current user', async () => {
      const result = await controller.createConnection(userId, {
        providerId: 'runway',
        displayName: 'My Runway Key',
        apiKey: 'sk-runway-key-123456789',
      });
      expect(result.id).toBe(connectionId);
      expect(service.create).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ providerId: 'runway' }),
      );
    });
  });

  describe('testConnection', () => {
    it('tests connection for user', async () => {
      const result = await controller.testConnection(userId, connectionId);
      expect(result.isValid).toBe(true);
      expect(service.testConnection).toHaveBeenCalledWith(connectionId, userId);
    });
  });
});

