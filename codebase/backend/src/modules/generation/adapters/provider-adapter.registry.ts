import { Injectable, NotFoundException } from '@nestjs/common';
import { VideoProviderAdapter } from './interfaces/video-provider-adapter.interface';
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

@Injectable()
export class ProviderAdapterRegistry {
  private readonly adapters = new Map<string, VideoProviderAdapter>();

  constructor(
    private readonly wanAdapter: WanVideoProviderAdapter,
    private readonly runwayAdapter: RunwayVideoProviderAdapter,
    private readonly mockAdapter: MockVideoProviderAdapter,
    private readonly nvidiaAdapter: NvidiaVideoProviderAdapter,
    private readonly huggingFaceAdapter: HuggingFaceVideoProviderAdapter,
    private readonly lumaAdapter: LumaVideoProviderAdapter,
    private readonly miniMaxAdapter: MiniMaxVideoProviderAdapter,
    private readonly klingAdapter: KlingVideoProviderAdapter,
    private readonly cloudflareAdapter: CloudflareVideoProviderAdapter,
    private readonly tencentAdapter: TencentHunyuanVideoProviderAdapter,
    private readonly googleVeoAdapter: GoogleVeoVideoProviderAdapter,
    private readonly awsBedrockAdapter: AwsBedrockVideoProviderAdapter,
    private readonly aggregatorAdapter: UniversalAggregatorVideoAdapter,
  ) {
    this.register(this.wanAdapter);
    this.register(this.runwayAdapter);
    this.register(this.mockAdapter);

    this.register(this.nvidiaAdapter);
    this.adapters.set('nvidia', this.nvidiaAdapter);

    this.register(this.huggingFaceAdapter);

    this.register(this.lumaAdapter);
    this.adapters.set('luma', this.lumaAdapter);

    this.register(this.miniMaxAdapter);
    this.adapters.set('minimax', this.miniMaxAdapter);

    this.register(this.klingAdapter);
    this.adapters.set('kling', this.klingAdapter);

    this.register(this.cloudflareAdapter);
    this.adapters.set('cloudflare', this.cloudflareAdapter);

    this.register(this.tencentAdapter);
    this.adapters.set('tencent', this.tencentAdapter);

    this.register(this.googleVeoAdapter);
    this.adapters.set('google', this.googleVeoAdapter);

    this.register(this.awsBedrockAdapter);
    this.adapters.set('bedrock', this.awsBedrockAdapter);

    // Register Aggregators & Direct relay engines
    const aggregators = [
      'piapi',
      'wavespeed-ai',
      'magic-hour',
      'freeind',
      'pika',
      'xai-grok',
      'bytedance-seedance',
      'vidu-ai',
      'pixverse',
    ];
    for (const agg of aggregators) {
      this.register(this.aggregatorAdapter.forProvider(agg));
    }
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
