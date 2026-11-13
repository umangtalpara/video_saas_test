import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersRepository } from './providers.repository';
import {
  AuthType,
  BillingClassification,
  ProviderDocument,
  ProviderType,
} from './schemas/provider.schema';
import { ProviderModelDocument } from './schemas/provider-model.schema';

describe('ProvidersService', () => {
  let service: ProvidersService;
  let repository: jest.Mocked<ProvidersRepository>;

  const mockProvider = {
    providerId: 'runway',
    displayName: 'Runway',
    company: 'Runway AI, Inc.',
    country: 'United States',
    providerType: ProviderType.DIRECT,
    documentationUrl: 'https://docs.runwayml.com',
    apiBaseUrl: 'https://api.runwayml.com/v1',
    authType: AuthType.BEARER,
    authHeaderName: 'Authorization',
    capabilities: ['text_to_video'],
    billingClassification: BillingClassification.USER_MANAGED,
    freeQuotaPolicy: {},
    isEnabled: true,
    isMaintenance: false,
    termsNotes: '',
    regionRestrictions: [],
    createdAt: new Date(),
  } as unknown as ProviderDocument;

  const mockModel = {
    providerId: 'runway',
    modelId: 'gen-3-alpha-turbo',
    displayName: 'Gen-3 Alpha Turbo',
    description: 'Fast model',
    capabilities: ['text_to_video'],
    supportedAspectRatios: ['16:9'],
    supportedResolutions: ['720p'],
    minDurationSeconds: 5,
    maxDurationSeconds: 10,
    isAsync: true,
    estimatedCostPerSecond: 0.05,
    freeQuotaEligible: false,
    isEnabled: true,
    createdAt: new Date(),
  } as unknown as ProviderModelDocument;

  beforeEach(async () => {
    const mockRepo = {
      countProviders: jest.fn().mockResolvedValue(1),
      createProvider: jest.fn().mockResolvedValue(mockProvider),
      createModel: jest.fn().mockResolvedValue(mockModel),
      findAllProviders: jest.fn().mockResolvedValue([mockProvider]),
      findProviderById: jest.fn().mockResolvedValue(mockProvider),
      updateProvider: jest.fn().mockResolvedValue(mockProvider),
      findAllModels: jest.fn().mockResolvedValue([mockModel]),
      findModel: jest.fn().mockResolvedValue(mockModel),
      updateModel: jest.fn().mockResolvedValue(mockModel),
      deleteModel: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        { provide: ProvidersRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
    repository = module.get(ProvidersRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllProviders', () => {
    it('returns array of provider response DTOs', async () => {
      const result = await service.findAllProviders(true);
      expect(result).toHaveLength(1);
      expect(result[0]?.providerId).toBe('runway');
    });
  });

  describe('findProviderById', () => {
    it('returns provider if found', async () => {
      const result = await service.findProviderById('runway');
      expect(result.displayName).toBe('Runway');
    });

    it('throws NotFoundException if provider not found', async () => {
      repository.findProviderById.mockResolvedValueOnce(null);
      await expect(service.findProviderById('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllModels', () => {
    it('returns models for a valid provider', async () => {
      const result = await service.findAllModels('runway', true);
      expect(result).toHaveLength(1);
      expect(result[0]?.modelId).toBe('gen-3-alpha-turbo');
    });
  });

  describe('findModel', () => {
    it('returns model if found', async () => {
      const result = await service.findModel('runway', 'gen-3-alpha-turbo');
      expect(result.displayName).toBe('Gen-3 Alpha Turbo');
    });

    it('throws NotFoundException if model not found', async () => {
      repository.findModel.mockResolvedValueOnce(null);
      await expect(
        service.findModel('runway', 'unknown-model'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteModel', () => {
    it('deletes model successfully', async () => {
      const result = await service.deleteModel('runway', 'gen-3-alpha-turbo');
      expect(result.message).toContain('deleted successfully');
    });
  });
});

