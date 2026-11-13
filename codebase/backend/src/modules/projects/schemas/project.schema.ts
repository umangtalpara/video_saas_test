import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VideoProjectDocument = HydratedDocument<VideoProject>;

export enum ProjectStatus {
  DRAFT = 'draft',
  SCRIPT_GENERATING = 'script_generating',
  AWAITING_APPROVAL = 'awaiting_approval',
  QUEUED = 'queued',
  GENERATING = 'generating',
  RENDERING = 'rendering',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum AspectRatio {
  PORTRAIT = '9:16',
  LANDSCAPE = '16:9',
  SQUARE = '1:1',
}

@Schema({ timestamps: true, collection: 'video_projects' })
export class VideoProject {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  prompt!: string;

  @Prop({ default: 30 })
  targetDurationSeconds!: number;

  @Prop({
    type: String,
    enum: Object.values(AspectRatio),
    default: AspectRatio.PORTRAIT,
  })
  aspectRatio!: AspectRatio;

  @Prop({ default: 'en', trim: true })
  language!: string;

  @Prop({ default: 'cinematic', trim: true })
  style!: string;

  @Prop({
    type: String,
    enum: Object.values(ProjectStatus),
    default: ProjectStatus.DRAFT,
    index: true,
  })
  status!: ProjectStatus;

  @Prop({ default: 'runway', trim: true })
  providerId!: string;

  @Prop({ type: Types.ObjectId, default: null })
  providerConnectionId!: Types.ObjectId | null;

  @Prop({ default: 'gen-3-alpha-turbo', trim: true })
  modelId!: string;

  @Prop({ default: 0 })
  totalDurationSeconds!: number;

  @Prop({ default: 0 })
  scenesCount!: number;

  @Prop({ default: false })
  scriptApproved!: boolean;

  @Prop({ type: String, default: null })
  finalVideoUrl!: string | null;

  @Prop({ type: String, default: null })
  thumbnailUrl!: string | null;

  @Prop({ default: '' })
  errorMessage!: string;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export const VideoProjectSchema = SchemaFactory.createForClass(VideoProject);
VideoProjectSchema.index({ userId: 1, createdAt: -1 });
VideoProjectSchema.index({ userId: 1, status: 1 });
