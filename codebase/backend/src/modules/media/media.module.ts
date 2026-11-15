import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaAsset, MediaAssetSchema } from './schemas/media-asset.schema';
import { MediaRepository } from './media.repository';
import { MediaController } from './media.controller';
import { S3StorageService } from './services/s3-storage.service';
import { MediaInspectorService } from './services/media-inspector.service';
import { SafeDownloaderService } from '../generation/services/safe-downloader.service';
import { FFmpegRendererService } from './services/ffmpeg-renderer.service';
import { SrtGeneratorService } from './services/srt-generator.service';
import { VideoAssemblyService } from './services/video-assembly.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MediaAsset.name, schema: MediaAssetSchema },
    ]),
    ProjectsModule,
  ],
  controllers: [MediaController],
  providers: [
    MediaRepository,
    S3StorageService,
    MediaInspectorService,
    SafeDownloaderService,
    FFmpegRendererService,
    SrtGeneratorService,
    VideoAssemblyService,
  ],
  exports: [
    MediaRepository,
    S3StorageService,
    MediaInspectorService,
    SafeDownloaderService,
    FFmpegRendererService,
    SrtGeneratorService,
    VideoAssemblyService,
  ],
})
export class MediaModule {}
