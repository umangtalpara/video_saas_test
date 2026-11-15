import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Provider, ProviderDocument } from './schemas/provider.schema';
import {
  ProviderModel,
  ProviderModelDocument,
} from './schemas/provider-model.schema';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CreateProviderModelDto } from './dto/create-provider-model.dto';
import { UpdateProviderModelDto } from './dto/update-provider-model.dto';

function hasErrorCode(error: unknown): error is { code: number } {
  return typeof error === 'object' && error !== null && 'code' in error;
}

@Injectable()
export class ProvidersRepository {
  constructor(
    @InjectModel(Provider.name)
    private readonly providerModel: Model<ProviderDocument>,
    @InjectModel(ProviderModel.name)
    private readonly modelModel: Model<ProviderModelDocument>,
  ) {}

  public async findAllProviders(onlyEnabled: boolean = true): Promise<ProviderDocument[]> {
    const filter = onlyEnabled ? { isEnabled: true } : {};
    return this.providerModel
      .find(filter)
      .sort({ 'freeQuotaPolicy.priorityRank': 1, displayName: 1 })
      .exec();
  }

  public async findProviderById(providerId: string): Promise<ProviderDocument | null> {
    return this.providerModel.findOne({ providerId }).exec();
  }

  public async createProvider(dto: CreateProviderDto): Promise<ProviderDocument> {
    try {
      return await this.providerModel.create(dto);
    } catch (error: unknown) {
      if (hasErrorCode(error) && error.code === 11000) {
        throw new ConflictException(`Provider '${dto.providerId}' already exists`);
      }
      throw error;
    }
  }

  public async updateProvider(
    providerId: string,
    dto: UpdateProviderDto,
  ): Promise<ProviderDocument | null> {
    return this.providerModel
      .findOneAndUpdate({ providerId }, { $set: dto }, { new: true })
      .exec();
  }

  public async countProviders(): Promise<number> {
    return this.providerModel.countDocuments().exec();
  }

  public async findAllModels(
    providerId?: string,
    onlyEnabled: boolean = true,
  ): Promise<ProviderModelDocument[]> {
    const filter: Record<string, unknown> = {};
    if (providerId) {
      filter['providerId'] = providerId;
    }
    if (onlyEnabled) {
      filter['isEnabled'] = true;
    }
    return this.modelModel.find(filter).sort({ displayName: 1 }).exec();
  }

  public async findModel(
    providerId: string,
    modelId: string,
  ): Promise<ProviderModelDocument | null> {
    return this.modelModel.findOne({ providerId, modelId }).exec();
  }

  public async createModel(
    providerId: string,
    dto: CreateProviderModelDto,
  ): Promise<ProviderModelDocument> {
    try {
      return await this.modelModel.create({ ...dto, providerId });
    } catch (error: unknown) {
      if (hasErrorCode(error) && error.code === 11000) {
        throw new ConflictException(
          `Model '${dto.modelId}' already exists for provider '${providerId}'`,
        );
      }
      throw error;
    }
  }

  public async updateModel(
    providerId: string,
    modelId: string,
    dto: UpdateProviderModelDto,
  ): Promise<ProviderModelDocument | null> {
    return this.modelModel
      .findOneAndUpdate({ providerId, modelId }, { $set: dto }, { new: true })
      .exec();
  }

  public async deleteModel(
    providerId: string,
    modelId: string,
  ): Promise<boolean> {
    const res = await this.modelModel.deleteOne({ providerId, modelId }).exec();
    return res.deletedCount > 0;
  }
}

