import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProviderConnectionDocument = HydratedDocument<ProviderConnection>;

export enum ConnectionStatus {
  UNTESTED = 'untested',
  VALID = 'valid',
  INVALID = 'invalid',
  QUOTA_EXHAUSTED = 'quota_exhausted',
  DISABLED = 'disabled',
  ERROR = 'error',
}

@Schema({ _id: false })
export class EncryptedCredentials {
  @Prop({ required: true })
  ciphertext!: string;

  @Prop({ required: true })
  iv!: string;

  @Prop({ required: true })
  authTag!: string;

  @Prop({ required: true, default: 1 })
  keyVersion!: number;
}

export const EncryptedCredentialsSchema =
  SchemaFactory.createForClass(EncryptedCredentials);

@Schema({ timestamps: true, collection: 'provider_connections' })
export class ProviderConnection {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, index: true, trim: true })
  providerId!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ type: EncryptedCredentialsSchema, required: true })
  encryptedCredentials!: EncryptedCredentials;

  @Prop({ required: true, trim: true })
  maskedKey!: string;

  @Prop({ default: 'global', trim: true })
  region!: string;

  @Prop({ default: '', trim: true })
  customBaseUrl!: string;

  @Prop({
    type: String,
    enum: Object.values(ConnectionStatus),
    default: ConnectionStatus.UNTESTED,
    index: true,
  })
  status!: ConnectionStatus;

  @Prop({ type: Date, default: null })
  lastTestedAt!: Date | null;

  @Prop({ type: Date, default: null })
  lastSuccessAt!: Date | null;

  @Prop({ default: '' })
  lastErrorCode!: string;

  @Prop({ default: '' })
  lastErrorMessage!: string;

  @Prop({ default: 50 })
  dailyJobLimit!: number;

  @Prop({ default: 500 })
  monthlyJobLimit!: number;

  @Prop({ default: 0 })
  maxCostPerProject!: number;

  @Prop({ default: false })
  blockPaidOrUnknownProviders!: boolean;

  @Prop({ default: true, index: true })
  isEnabled!: boolean;

  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export const ProviderConnectionSchema =
  SchemaFactory.createForClass(ProviderConnection);

ProviderConnectionSchema.index({ userId: 1, providerId: 1 });
ProviderConnectionSchema.index({ userId: 1, isEnabled: 1 });

