import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ProviderConnection,
  ProviderConnectionDocument,
} from './schemas/provider-connection.schema';

@Injectable()
export class ProviderConnectionsRepository {
  constructor(
    @InjectModel(ProviderConnection.name)
    private readonly connectionModel: Model<ProviderConnectionDocument>,
  ) {}

  public async findAllByUser(
    userId: string,
    onlyEnabled: boolean = false,
  ): Promise<ProviderConnectionDocument[]> {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (onlyEnabled) {
      filter['isEnabled'] = true;
    }
    return this.connectionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();
  }

  public async findByIdAndUser(
    id: string,
    userId: string,
  ): Promise<ProviderConnectionDocument | null> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
      return null;
    }
    return this.connectionModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();
  }

  public async create(
    data: Partial<ProviderConnection>,
  ): Promise<ProviderConnectionDocument> {
    return this.connectionModel.create(data);
  }

  public async updateByIdAndUser(
    id: string,
    userId: string,
    update: Partial<ProviderConnection>,
  ): Promise<ProviderConnectionDocument | null> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
      return null;
    }
    return this.connectionModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          userId: new Types.ObjectId(userId),
        },
        { $set: update },
        { new: true },
      )
      .exec();
  }

  public async deleteByIdAndUser(
    id: string,
    userId: string,
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
      return false;
    }
    const res = await this.connectionModel
      .deleteOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    return res.deletedCount > 0;
  }
}

