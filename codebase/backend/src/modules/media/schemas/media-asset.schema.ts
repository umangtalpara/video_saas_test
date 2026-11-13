import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MediaAssetDocument = HydratedDocument<MediaAsset>;

export enum AssetType {
  SCENE_CLIP = 'scene_clip',
  FINAL_RENDER = 'final_render',
  AUDIO_TRACK = 'audio_track',
  THUMBNAIL = 'thumbnail',
}

@Schema({ timestamps: true, collection: 'media_assets' })
export class MediaAsset {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  sceneId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: Object.values(AssetType),
    default: AssetType.SCENE_CLIP,
    index: true,
  })
  assetType!: AssetType;

  @Prop({ default: 'videoforge-assets', trim: true })
  s3Bucket!: string;

  @Prop({ required: true, trim: true })
  s3Key!: string;

  @Prop({ required: true, trim: true })
  publicUrl!: string;

  @Prop({ default: 0 })
  fileSizeBytes!: number;

  @Prop({ default: 'video/mp4', trim: true })
  mimeType!: string;

  @Prop({ default: 0 })
  durationSeconds!: number;

  @Prop({ default: '1280x720', trim: true })
  resolution!: string;

  @Prop({ default: 'h264', trim: true })
  codec!: string;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export const MediaAssetSchema = SchemaFactory.createForClass(MediaAsset);
MediaAssetSchema.index({ userId: 1, projectId: 1 });
MediaAssetSchema.index({ userId: 1, createdAt: -1 });

