import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaAsset, MediaAssetSchema } from './schemas/media-asset.schema';
import { MediaRepository } from './media.repository';
import { S3StorageService } from './services/s3-storage.service';
import { MediaInspectorService } from './services/media-inspector.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MediaAsset.name, schema: MediaAssetSchema },
    ]),
  ],
  providers: [
    MediaRepository,
    S3StorageService,
    MediaInspectorService,
  ],
  exports: [
    MediaRepository,
    S3StorageService,
    MediaInspectorService,
  ],
})
export class MediaModule {}
