import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProviderModelDocument = HydratedDocument<ProviderModel>;

@Schema({ timestamps: true, collection: 'provider_models' })
export class ProviderModel {
  @Prop({ required: true, index: true, trim: true })
  providerId!: string;

  @Prop({ required: true, trim: true })
  modelId!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ default: '', trim: true })
  description!: string;

  @Prop({ type: [String], default: ['text_to_video'] })
  capabilities!: string[];

  @Prop({ type: [String], default: ['16:9', '9:16', '1:1'] })
  supportedAspectRatios!: string[];

  @Prop({ type: [String], default: ['720p', '1080p'] })
  supportedResolutions!: string[];

  @Prop({ default: 5 })
  minDurationSeconds!: number;

  @Prop({ default: 10 })
  maxDurationSeconds!: number;

  @Prop({ default: true })
  isAsync!: boolean;

  @Prop({ default: 0 })
  estimatedCostPerSecond!: number;

  @Prop({ default: false })
  freeQuotaEligible!: boolean;

  @Prop({ default: true, index: true })
  isEnabled!: boolean;

  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export const ProviderModelSchema = SchemaFactory.createForClass(ProviderModel);
ProviderModelSchema.index({ providerId: 1, modelId: 1 }, { unique: true });
ProviderModelSchema.index({ providerId: 1, isEnabled: 1 });

