import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

export enum AuditAction {
  USER_SUSPENSION_TOGGLE = 'user_suspension_toggle',
  PROVIDER_KILLSWITCH_TOGGLE = 'provider_killswitch_toggle',
  SETTINGS_UPDATE = 'settings_update',
}

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  adminUserId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  adminEmail!: string;

  @Prop({
    type: String,
    enum: Object.values(AuditAction),
    required: true,
    index: true,
  })
  action!: AuditAction;

  @Prop({ required: true, trim: true })
  targetType!: string; // 'user' | 'provider' | 'system'

  @Prop({ required: true, trim: true })
  targetId!: string;

  @Prop({ type: Object, default: {} })
  details!: Record<string, unknown>;

  @Prop({ default: '127.0.0.1', trim: true })
  ipAddress!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

