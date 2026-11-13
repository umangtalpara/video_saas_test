import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MediaAsset,
  MediaAssetDocument,
} from './schemas/media-asset.schema';

@Injectable()
export class MediaRepository {
  constructor(
    @InjectModel(MediaAsset.name)
    private readonly assetModel: Model<MediaAssetDocument>,
  ) {}

  public async create(data: Partial<MediaAsset>): Promise<MediaAssetDocument> {
    return this.assetModel.create(data);
  }

  public async findByProject(
    projectId: string,
    userId: string,
  ): Promise<MediaAssetDocument[]> {
    if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(userId)) {
      return [];
    }
    return this.assetModel
      .find({
        projectId: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId),
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  public async findByScene(
    sceneId: string,
    userId: string,
  ): Promise<MediaAssetDocument | null> {
    if (!Types.ObjectId.isValid(sceneId) || !Types.ObjectId.isValid(userId)) {
      return null;
    }
    return this.assetModel
      .findOne({
        sceneId: new Types.ObjectId(sceneId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
  }

  public async findByIdAndUser(
    id: string,
    userId: string,
  ): Promise<MediaAssetDocument | null> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
      return null;
    }
    return this.assetModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();
  }

  public async deleteByProject(
    projectId: string,
    userId: string,
  ): Promise<number> {
    if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(userId)) {
      return 0;
    }
    const res = await this.assetModel
      .deleteMany({
        projectId: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    return res.deletedCount || 0;
  }
}
