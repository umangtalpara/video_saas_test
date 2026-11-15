import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProviderAdapterRegistry } from './provider-adapter.registry';
import { WanVideoProviderAdapter } from './wan-video-provider.adapter';
import { RunwayVideoProviderAdapter } from './runway-video-provider.adapter';
import { MockVideoProviderAdapter } from './mock-video-provider.adapter';
import { NvidiaVideoProviderAdapter } from './nvidia-video-provider.adapter';
import { HuggingFaceVideoProviderAdapter } from './huggingface-video-provider.adapter';
import { LumaVideoProviderAdapter } from './luma-video-provider.adapter';
import { MiniMaxVideoProviderAdapter } from './minimax-video-provider.adapter';
import { KlingVideoProviderAdapter } from './kling-video-provider.adapter';
import { CloudflareVideoProviderAdapter } from './cloudflare-video-provider.adapter';
import { TencentHunyuanVideoProviderAdapter } from './tencent-hunyuan-video-provider.adapter';
import { GoogleVeoVideoProviderAdapter } from './google-veo-video-provider.adapter';
import { AwsBedrockVideoProviderAdapter } from './aws-bedrock-video-provider.adapter';
import { UniversalAggregatorVideoAdapter } from './universal-aggregator-video.adapter';
import { S3StorageService } from '../../media/services/s3-storage.service';

describe('ProviderAdapterRegistry', () => {
  let registry: ProviderAdapterRegistry;

  const mockS3Service = {
    uploadBuffer: jest.fn().mockResolvedValue({ publicUrl: 'https://cdn.example.com/test.mp4' }),
    getBucketName: jest.fn().mockReturnValue('test-bucket'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderAdapterRegistry,
        WanVideoProviderAdapter,
        RunwayVideoProviderAdapter,
        MockVideoProviderAdapter,
        NvidiaVideoProviderAdapter,
        HuggingFaceVideoProviderAdapter,
        LumaVideoProviderAdapter,
        MiniMaxVideoProviderAdapter,
        KlingVideoProviderAdapter,
        CloudflareVideoProviderAdapter,
        TencentHunyuanVideoProviderAdapter,
        GoogleVeoVideoProviderAdapter,
        AwsBedrockVideoProviderAdapter,
        UniversalAggregatorVideoAdapter,
        { provide: S3StorageService, useValue: mockS3Service },
      ],
    }).compile();

    registry = module.get<ProviderAdapterRegistry>(ProviderAdapterRegistry);
  });

  it('should be defined', () => {
    expect(registry).toBeDefined();
  });

  it('should list all registered providers including zero-cost and direct AI providers', () => {
    const list = registry.listSupportedProviders();
    expect(list).toContain('wan');
    expect(list).toContain('runway');
    expect(list).toContain('mock');
    expect(list).toContain('nvidia-cosmos');
    expect(list).toContain('huggingface');
    expect(list).toContain('luma-ai');
    expect(list).toContain('minimax-hailuo');
    expect(list).toContain('kling-ai');
    expect(list).toContain('cloudflare-workers-ai');
    expect(list).toContain('tencent-hunyuan');
    expect(list).toContain('google-ai');
    expect(list).toContain('aws-bedrock');
    expect(list).toContain('piapi');
    expect(list).toContain('wavespeed-ai');
  });

  it('should check if provider adapter exists', () => {
    expect(registry.hasAdapter('wan')).toBe(true);
    expect(registry.hasAdapter('WAN')).toBe(true);
    expect(registry.hasAdapter('mock')).toBe(true);
    expect(registry.hasAdapter('nvidia-cosmos')).toBe(true);
    expect(registry.hasAdapter('huggingface')).toBe(true);
    expect(registry.hasAdapter('piapi')).toBe(true);
    expect(registry.hasAdapter('unknown')).toBe(false);
  });

  it('should return adapter by id', () => {
    const adapter = registry.getAdapter('mock');
    expect(adapter).toBeDefined();
    expect(adapter.providerId).toBe('mock');

    const nvidia = registry.getAdapter('nvidia-cosmos');
    expect(nvidia).toBeDefined();
    expect(nvidia.providerId).toBe('nvidia-cosmos');
  });

  it('should throw NotFoundException for unsupported provider', () => {
    expect(() => registry.getAdapter('non-existent')).toThrow(NotFoundException);
  });
});
