import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ProvidersRepository } from './providers.repository';
import { ProviderDocument } from './schemas/provider.schema';
import { ProviderModelDocument } from './schemas/provider-model.schema';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CreateProviderModelDto } from './dto/create-provider-model.dto';
import { UpdateProviderModelDto } from './dto/update-provider-model.dto';
import { ProviderResponseDto } from './dto/provider-response.dto';
import { ProviderModelResponseDto } from './dto/provider-model-response.dto';
import { SEED_PROVIDERS } from './providers.seed';

@Injectable()
export class ProvidersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(private readonly providersRepository: ProvidersRepository) {}

  public async onApplicationBootstrap(): Promise<void> {
    await this.seedDefaultCatalogIfEmpty();
  }

  public async seedDefaultCatalogIfEmpty(): Promise<void> {
    for (const item of SEED_PROVIDERS) {
      const existing = await this.providersRepository.findProviderById(item.provider.providerId);
      if (!existing) {
        const provider = await this.providersRepository.createProvider(item.provider);
        for (const model of item.models) {
          await this.providersRepository.createModel(provider.providerId, model);
        }
      }
    }
    this.logger.log(`Verified complete catalogue of ${SEED_PROVIDERS.length} official AI video providers.`);
  }

  public async findAllProviders(
    onlyEnabled: boolean = true,
  ): Promise<ProviderResponseDto[]> {
    const list = await this.providersRepository.findAllProviders(onlyEnabled);
    return list.map((p: ProviderDocument) => ProviderResponseDto.fromEntity(p));
  }

  public async findProviderById(providerId: string): Promise<ProviderResponseDto> {
    const provider = await this.providersRepository.findProviderById(providerId);
    if (!provider) {
      throw new NotFoundException(`Provider '${providerId}' not found`);
    }
    return ProviderResponseDto.fromEntity(provider);
  }

  public async createProvider(dto: CreateProviderDto): Promise<ProviderResponseDto> {
    const created = await this.providersRepository.createProvider(dto);
    return ProviderResponseDto.fromEntity(created);
  }

  public async updateProvider(
    providerId: string,
    dto: UpdateProviderDto,
  ): Promise<ProviderResponseDto> {
    const updated = await this.providersRepository.updateProvider(providerId, dto);
    if (!updated) {
      throw new NotFoundException(`Provider '${providerId}' not found`);
    }
    return ProviderResponseDto.fromEntity(updated);
  }

  public async findAllModels(
    providerId: string,
    onlyEnabled: boolean = true,
  ): Promise<ProviderModelResponseDto[]> {
    await this.findProviderById(providerId);
    const models = await this.providersRepository.findAllModels(
      providerId,
      onlyEnabled,
    );
    return models.map((m: ProviderModelDocument) =>
      ProviderModelResponseDto.fromEntity(m),
    );
  }

  public async findModel(
    providerId: string,
    modelId: string,
  ): Promise<ProviderModelResponseDto> {
    const model = await this.providersRepository.findModel(providerId, modelId);
    if (!model) {
      throw new NotFoundException(
        `Model '${modelId}' not found for provider '${providerId}'`,
      );
    }
    return ProviderModelResponseDto.fromEntity(model);
  }

  public async createModel(
    providerId: string,
    dto: CreateProviderModelDto,
  ): Promise<ProviderModelResponseDto> {
    await this.findProviderById(providerId);
    const created = await this.providersRepository.createModel(providerId, dto);
    return ProviderModelResponseDto.fromEntity(created);
  }

  public async updateModel(
    providerId: string,
    modelId: string,
    dto: UpdateProviderModelDto,
  ): Promise<ProviderModelResponseDto> {
    const updated = await this.providersRepository.updateModel(
      providerId,
      modelId,
      dto,
    );
    if (!updated) {
      throw new NotFoundException(
        `Model '${modelId}' not found for provider '${providerId}'`,
      );
    }
    return ProviderModelResponseDto.fromEntity(updated);
  }

  public async deleteModel(
    providerId: string,
    modelId: string,
  ): Promise<{ message: string }> {
    const deleted = await this.providersRepository.deleteModel(providerId, modelId);
    if (!deleted) {
      throw new NotFoundException(
        `Model '${modelId}' not found for provider '${providerId}'`,
      );
    }
    return { message: `Model '${modelId}' deleted successfully` };
  }
}

