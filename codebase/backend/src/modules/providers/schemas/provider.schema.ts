import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProviderDocument = HydratedDocument<Provider>;

export enum ProviderType {
  DIRECT = 'direct',
  AGGREGATOR = 'aggregator',
}

export enum AuthType {
  BEARER = 'bearer',
  API_KEY_HEADER = 'api_key_header',
  QUERY_PARAMETER = 'query_parameter',
  CUSTOM = 'custom',
}

export enum BillingClassification {
  FREE_VERIFIED = 'free_verified',
  TRIAL = 'trial',
  PAID = 'paid',
  UNKNOWN = 'unknown',
  USER_MANAGED = 'user_managed',
}

@Schema({ timestamps: true, collection: 'provider_catalogs' })
export class Provider {
  @Prop({ required: true, unique: true, index: true, trim: true })
  providerId!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ required: true, trim: true })
  company!: string;

  @Prop({ default: 'Global', trim: true })
  country!: string;

  @Prop({
    type: String,
    enum: Object.values(ProviderType),
    default: ProviderType.DIRECT,
  })
  providerType!: ProviderType;

  @Prop({ required: true, trim: true })
  documentationUrl!: string;

  @Prop({ required: true, trim: true })
  apiBaseUrl!: string;

  @Prop({
    type: String,
    enum: Object.values(AuthType),
    default: AuthType.BEARER,
  })
  authType!: AuthType;

  @Prop({ default: 'Authorization', trim: true })
  authHeaderName!: string;

  @Prop({ type: [String], default: ['text_to_video'] })
  capabilities!: string[];

  @Prop({
    type: String,
    enum: Object.values(BillingClassification),
    default: BillingClassification.USER_MANAGED,
  })
  billingClassification!: BillingClassification;

  @Prop({ type: Object, default: {} })
  freeQuotaPolicy!: Record<string, unknown>;

  @Prop({ default: true, index: true })
  isEnabled!: boolean;

  @Prop({ default: false })
  isMaintenance!: boolean;

  @Prop({ default: '' })
  termsNotes!: string;

  @Prop({ type: [String], default: [] })
  regionRestrictions!: string[];

  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export const ProviderSchema = SchemaFactory.createForClass(Provider);
ProviderSchema.index({ providerId: 1, isEnabled: 1 });

