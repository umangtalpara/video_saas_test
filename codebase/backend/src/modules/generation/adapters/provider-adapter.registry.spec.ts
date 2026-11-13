import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProviderAdapterRegistry } from './provider-adapter.registry';
import { WanVideoProviderAdapter } from './wan-video-provider.adapter';
import { RunwayVideoProviderAdapter } from './runway-video-provider.adapter';
import { MockVideoProviderAdapter } from './mock-video-provider.adapter';

describe('ProviderAdapterRegistry', () => {
  let registry: ProviderAdapterRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderAdapterRegistry,
        WanVideoProviderAdapter,
        RunwayVideoProviderAdapter,
        MockVideoProviderAdapter,
      ],
    }).compile();

    registry = module.get<ProviderAdapterRegistry>(ProviderAdapterRegistry);
  });

  it('should be defined', () => {
    expect(registry).toBeDefined();
  });

  it('should list all registered providers', () => {
    const list = registry.listSupportedProviders();
    expect(list).toContain('wan');
    expect(list).toContain('runway');
    expect(list).toContain('mock');
  });

  it('should check if provider adapter exists', () => {
    expect(registry.hasAdapter('wan')).toBe(true);
    expect(registry.hasAdapter('WAN')).toBe(true);
    expect(registry.hasAdapter('mock')).toBe(true);
    expect(registry.hasAdapter('unknown')).toBe(false);
  });

  it('should return adapter by id', () => {
    const adapter = registry.getAdapter('mock');
    expect(adapter).toBeDefined();
    expect(adapter.providerId).toBe('mock');
  });

  it('should throw NotFoundException for unsupported provider', () => {
    expect(() => registry.getAdapter('non-existent')).toThrow(NotFoundException);
  });
});
