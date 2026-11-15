import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { ProviderConnectionsModule } from '../provider-connections/provider-connections.module';
import { MediaModule } from '../media/media.module';
import { UsageModule } from '../usage/usage.module';
import { GenerationController } from './generation.controller';
import { WanVideoProviderAdapter } from './adapters/wan-video-provider.adapter';
import { RunwayVideoProviderAdapter } from './adapters/runway-video-provider.adapter';
import { MockVideoProviderAdapter } from './adapters/mock-video-provider.adapter';
import { NvidiaVideoProviderAdapter } from './adapters/nvidia-video-provider.adapter';
import { HuggingFaceVideoProviderAdapter } from './adapters/huggingface-video-provider.adapter';
import { LumaVideoProviderAdapter } from './adapters/luma-video-provider.adapter';
import { MiniMaxVideoProviderAdapter } from './adapters/minimax-video-provider.adapter';
import { KlingVideoProviderAdapter } from './adapters/kling-video-provider.adapter';
import { CloudflareVideoProviderAdapter } from './adapters/cloudflare-video-provider.adapter';
import { TencentHunyuanVideoProviderAdapter } from './adapters/tencent-hunyuan-video-provider.adapter';
import { GoogleVeoVideoProviderAdapter } from './adapters/google-veo-video-provider.adapter';
import { AwsBedrockVideoProviderAdapter } from './adapters/aws-bedrock-video-provider.adapter';
import { UniversalAggregatorVideoAdapter } from './adapters/universal-aggregator-video.adapter';
import { ProviderAdapterRegistry } from './adapters/provider-adapter.registry';
import { SceneProcessorService } from './services/scene-processor.service';
import { GenerationQueueService } from './services/generation-queue.service';

@Module({
  imports: [
    ProjectsModule,
    ProviderConnectionsModule,
    MediaModule,
    UsageModule,
  ],
  controllers: [GenerationController],
  providers: [
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
    ProviderAdapterRegistry,
    SceneProcessorService,
    GenerationQueueService,
  ],
  exports: [
    GenerationQueueService,
    ProviderAdapterRegistry,
  ],
})
export class GenerationModule {}
