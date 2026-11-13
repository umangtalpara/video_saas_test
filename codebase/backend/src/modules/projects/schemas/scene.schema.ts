import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VideoSceneDocument = HydratedDocument<VideoScene>;

export enum SceneStatus {
  DRAFT = 'draft',
  QUEUED = 'queued',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Schema({ timestamps: true, collection: 'video_scenes' })
export class VideoScene {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  sceneNumber!: number;

  @Prop({ default: '', trim: true })
  narration!: string;

  @Prop({ required: true, trim: true })
  visualPrompt!: string;

  @Prop({ default: '', trim: true })
  negativePrompt!: string;

  @Prop({ default: 5 })
  plannedDurationSeconds!: number;

  @Prop({ default: 'runway', trim: true })
  providerId!: string;

  @Prop({ default: 'gen-3-alpha-turbo', trim: true })
  modelId!: string;

  @Prop({ default: 'text_to_video' })
  generationMode!: string;

  @Prop({ default: '', trim: true })
  continuityNotes!: string;

  @Prop({ default: 'none', trim: true })
  transition!: string;

  @Prop({
    type: String,
    enum: Object.values(SceneStatus),
    default: SceneStatus.DRAFT,
    index: true,
  })
  status!: SceneStatus;

  @Prop({ type: String, default: null })
  videoAssetUrl!: string | null;

  @Prop({ type: String, default: null })
  thumbnailUrl!: string | null;

  @Prop({ type: String, default: null })
  providerJobId!: string | null;

  @Prop({ default: 0 })
  actualDurationSeconds!: number;

  @Prop({ default: '' })
  resolution!: string;

  @Prop({ default: '' })
  errorMessage!: string;

  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export const VideoSceneSchema = SchemaFactory.createForClass(VideoScene);
VideoSceneSchema.index({ projectId: 1, sceneNumber: 1 });
VideoSceneSchema.index({ userId: 1, projectId: 1 });
