import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { ProviderResponseDto } from './dto/provider-response.dto';
import { ProviderModelResponseDto } from './dto/provider-model-response.dto';
import {
  AuthType,
  BillingClassification,
  ProviderType,
} from './schemas/provider.schema';

describe('ProvidersController', () => {
  let controller: ProvidersController;
  let service: jest.Mocked<ProvidersService>;

  const mockProviderResponse: ProviderResponseDto = {
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
  };

  const mockModelResponse: ProviderModelResponseDto = {
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
  };

  beforeEach(async () => {
    const mockService = {
      findAllProviders: jest.fn().mockResolvedValue([mockProviderResponse]),
      findProviderById: jest.fn().mockResolvedValue(mockProviderResponse),
      createProvider: jest.fn().mockResolvedValue(mockProviderResponse),
      updateProvider: jest.fn().mockResolvedValue(mockProviderResponse),
      findAllModels: jest.fn().mockResolvedValue([mockModelResponse]),
      findModel: jest.fn().mockResolvedValue(mockModelResponse),
      createModel: jest.fn().mockResolvedValue(mockModelResponse),
      updateModel: jest.fn().mockResolvedValue(mockModelResponse),
      deleteModel: jest
        .fn()
        .mockResolvedValue({ message: 'Model deleted successfully' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [{ provide: ProvidersService, useValue: mockService }],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
    service = module.get(ProvidersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProviders', () => {
    it('returns all enabled providers by default', async () => {
      const result = await controller.getProviders();
      expect(result).toHaveLength(1);
      expect(service.findAllProviders).toHaveBeenCalledWith(true);
    });

    it('passes false if all=true is queried', async () => {
      await controller.getProviders('true');
      expect(service.findAllProviders).toHaveBeenCalledWith(false);
    });
  });

  describe('getProvider', () => {
    it('returns single provider', async () => {
      const result = await controller.getProvider('runway');
      expect(result.providerId).toBe('runway');
    });
  });

  describe('getModels', () => {
    it('returns models for provider', async () => {
      const result = await controller.getModels('runway');
      expect(result).toHaveLength(1);
      expect(result[0]?.modelId).toBe('gen-3-alpha-turbo');
    });
  });

  describe('getModel', () => {
    it('returns model detail', async () => {
      const result = await controller.getModel('runway', 'gen-3-alpha-turbo');
      expect(result.modelId).toBe('gen-3-alpha-turbo');
    });
  });
});

