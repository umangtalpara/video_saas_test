import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { ProviderConnectionsModule } from '../provider-connections/provider-connections.module';
import { MediaModule } from '../media/media.module';
import { GenerationController } from './generation.controller';
import { WanVideoProviderAdapter } from './adapters/wan-video-provider.adapter';
import { RunwayVideoProviderAdapter } from './adapters/runway-video-provider.adapter';
import { MockVideoProviderAdapter } from './adapters/mock-video-provider.adapter';
import { ProviderAdapterRegistry } from './adapters/provider-adapter.registry';
import { SceneProcessorService } from './services/scene-processor.service';
import { GenerationQueueService } from './services/generation-queue.service';

@Module({
  imports: [
    ProjectsModule,
    ProviderConnectionsModule,
    MediaModule,
  ],
  controllers: [GenerationController],
  providers: [
    WanVideoProviderAdapter,
    RunwayVideoProviderAdapter,
    MockVideoProviderAdapter,
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
