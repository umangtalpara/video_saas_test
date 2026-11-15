import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProviderUsageDocument = HydratedDocument<ProviderUsage>;

export enum UsageOperation {
  VIDEO_GENERATION = 'video_generation',
  SCRIPT_PLANNING = 'script_planning',
  MEDIA_ASSEMBLY = 'media_assembly',
}

export enum UsageStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Schema({ timestamps: true, collection: 'provider_usage' })
export class ProviderUsage {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  projectId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  sceneId?: Types.ObjectId | null;

  @Prop({ required: true, trim: true, index: true })
  providerId!: string;

  @Prop({ required: true, trim: true })
  modelId!: string;

  @Prop({
    type: String,
    enum: Object.values(UsageOperation),
    default: UsageOperation.VIDEO_GENERATION,
  })
  operation!: UsageOperation;

  @Prop({
    type: String,
    enum: Object.values(UsageStatus),
    default: UsageStatus.SUCCESS,
  })
  status!: UsageStatus;

  @Prop({ default: 0 })
  unitsConsumed!: number; // e.g. seconds generated or tokens used

  @Prop({ default: 0 })
  durationSeconds!: number;

  @Prop({ default: 0.0 })
  costEstimatedUsd!: number;

  @Prop({ default: false })
  isPaid!: boolean;

  @Prop({ type: String, default: null, trim: true })
  errorMessage?: string | null;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ProviderUsageSchema = SchemaFactory.createForClass(ProviderUsage);
ProviderUsageSchema.index({ userId: 1, createdAt: -1 });
ProviderUsageSchema.index({ providerId: 1, createdAt: -1 });

