import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document<Types.ObjectId>;

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPPORT = 'support',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

@Schema({ _id: false })
export class UserPreferences {
  @Prop({ default: 'en' })
  language!: string;

  @Prop({ default: 'UTC' })
  timezone!: string;

  @Prop({ default: 'system', enum: ['light', 'dark', 'system'] })
  theme!: string;
}

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ enum: UserRole, default: UserRole.USER, index: true })
  role!: UserRole;

  @Prop({
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
    index: true,
  })
  status!: UserStatus;

  @Prop({ type: Date, default: null })
  emailVerifiedAt?: Date | null;

  @Prop({ type: String, default: null })
  emailVerificationToken?: string | null;

  @Prop({ type: Date, default: null })
  emailVerificationExpires?: Date | null;

  @Prop({ type: String, default: null })
  passwordResetToken?: string | null;

  @Prop({ type: Date, default: null })
  passwordResetExpires?: Date | null;

  @Prop({ type: String, default: null })
  refreshTokenHash?: string | null;

  @Prop({ type: UserPreferences, default: () => ({}) })
  preferences!: UserPreferences;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
