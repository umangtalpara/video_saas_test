import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ProjectStatus,
  VideoProject,
  VideoProjectDocument,
} from './schemas/project.schema';
import { VideoScene, VideoSceneDocument } from './schemas/scene.schema';
import { QueryProjectDto } from './dto/query-project.dto';

@Injectable()
export class ProjectsRepository {
  constructor(
    @InjectModel(VideoProject.name)
    private readonly projectModel: Model<VideoProjectDocument>,
    @InjectModel(VideoScene.name)
    private readonly sceneModel: Model<VideoSceneDocument>,
  ) {}

  public async findAllForUser(
    userId: string,
    query: QueryProjectDto,
  ): Promise<VideoProjectDocument[]> {
    if (!Types.ObjectId.isValid(userId)) return [];
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (query.status) {
      filter['status'] = query.status;
    }
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    return this.projectModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  public async countForUser(
    userId: string,
    status?: ProjectStatus,
  ): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) return 0;
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (status) {
      filter['status'] = status;
    }
    return this.projectModel.countDocuments(filter).exec();
  }

  public async findByIdAndUser(
    id: string,
    userId: string,
  ): Promise<VideoProjectDocument | null> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
      return null;
    }
    return this.projectModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();
  }

  public async create(
    data: Partial<VideoProject>,
  ): Promise<VideoProjectDocument> {
    return this.projectModel.create(data);
  }

  public async updateByIdAndUser(
    id: string,
    userId: string,
    update: Partial<VideoProject>,
  ): Promise<VideoProjectDocument | null> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
      return null;
    }
    return this.projectModel
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
    const project = await this.projectModel
      .findOneAndDelete({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!project) return false;

    // Cascade delete associated scenes
    await this.sceneModel
      .deleteMany({ projectId: new Types.ObjectId(id) })
      .exec();
    return true;
  }

  public async findScenesForProject(
    projectId: string,
  ): Promise<VideoSceneDocument[]> {
    if (!Types.ObjectId.isValid(projectId)) return [];
    return this.sceneModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .sort({ sceneNumber: 1 })
      .exec();
  }

  public async createScenes(
    scenes: Partial<VideoScene>[],
  ): Promise<VideoSceneDocument[]> {
    const result = await this.sceneModel.insertMany(
      scenes as unknown as VideoScene[],
    );
    return result as unknown as VideoSceneDocument[];
  }

  public async replaceScenesForProject(
    projectId: string,
    scenes: Partial<VideoScene>[],
  ): Promise<VideoSceneDocument[]> {
    if (!Types.ObjectId.isValid(projectId)) return [];
    await this.sceneModel
      .deleteMany({ projectId: new Types.ObjectId(projectId) })
      .exec();
    if (scenes.length === 0) return [];
    const result = await this.sceneModel.insertMany(
      scenes as unknown as VideoScene[],
    );
    return result as unknown as VideoSceneDocument[];
  }

  public async updateScene(
    sceneId: string,
    projectId: string,
    userId: string,
    update: Partial<VideoScene>,
  ): Promise<VideoSceneDocument | null> {
    if (!Types.ObjectId.isValid(sceneId) || !Types.ObjectId.isValid(projectId)) {
      return null;
    }
    return this.sceneModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(sceneId),
          projectId: new Types.ObjectId(projectId),
          userId: new Types.ObjectId(userId),
        },
        { $set: update },
        { new: true },
      )
      .exec();
  }
}
