import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserLimitsDocument = HydratedDocument<UserLimits>;

@Schema({ timestamps: true, collection: 'user_limits' })
export class UserLimits {
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ default: 25 })
  dailyJobCap!: number;

  @Prop({ default: 250 })
  monthlyJobCap!: number;

  @Prop({ default: 10.0 })
  maxCostPerProjectUsd!: number;

  @Prop({ default: true })
  blockPaidProviders!: boolean;

  @Prop({ type: [String], default: [] })
  allowedProviders!: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserLimitsSchema = SchemaFactory.createForClass(UserLimits);

