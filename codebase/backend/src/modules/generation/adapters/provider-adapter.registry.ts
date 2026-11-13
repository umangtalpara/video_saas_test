import { Injectable, NotFoundException } from '@nestjs/common';
import { VideoProviderAdapter } from './interfaces/video-provider-adapter.interface';
import { WanVideoProviderAdapter } from './wan-video-provider.adapter';
import { RunwayVideoProviderAdapter } from './runway-video-provider.adapter';
import { MockVideoProviderAdapter } from './mock-video-provider.adapter';

@Injectable()
export class ProviderAdapterRegistry {
  private readonly adapters = new Map<string, VideoProviderAdapter>();

  constructor(
    private readonly wanAdapter: WanVideoProviderAdapter,
    private readonly runwayAdapter: RunwayVideoProviderAdapter,
    private readonly mockAdapter: MockVideoProviderAdapter,
  ) {
    this.register(this.wanAdapter);
    this.register(this.runwayAdapter);
    this.register(this.mockAdapter);
  }

  public register(adapter: VideoProviderAdapter): void {
    this.adapters.set(adapter.providerId.toLowerCase(), adapter);
  }

  public getAdapter(providerId: string): VideoProviderAdapter {
    const key = providerId.toLowerCase();
    const adapter = this.adapters.get(key);
    if (!adapter) {
      throw new NotFoundException(
        `Video provider adapter for '${providerId}' is not registered or supported`,
      );
    }
    return adapter;
  }

  public hasAdapter(providerId: string): boolean {
    return this.adapters.has(providerId.toLowerCase());
  }

  public listSupportedProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
}
