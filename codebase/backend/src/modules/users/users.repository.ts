import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserData } from './dto/create-user.dto';

function hasErrorCode(error: unknown): error is { code: number } {
  return typeof error === 'object' && error !== null && 'code' in error;
}

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  public async create(data: CreateUserData): Promise<UserDocument> {
    try {
      return await this.userModel.create(data);
    } catch (error: unknown) {
      if (hasErrorCode(error) && error.code === 11000) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  public async findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.userModel.findById(id).exec();
  }

  public async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .exec();
  }

  public async findByVerificationToken(
    token: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() },
      })
      .exec();
  }

  public async findByPasswordResetToken(
    token: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      })
      .exec();
  }

  public async update(
    id: string,
    update: Partial<User>,
  ): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.userModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .exec();
  }

  public async updateRefreshToken(
    id: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      return;
    }
    await this.userModel
      .findByIdAndUpdate(id, { $set: { refreshTokenHash } })
      .exec();
  }
}

