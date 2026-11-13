import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CreateProviderModelDto } from './dto/create-provider-model.dto';
import { UpdateProviderModelDto } from './dto/update-provider-model.dto';
import { ProviderResponseDto } from './dto/provider-response.dto';
import { ProviderModelResponseDto } from './dto/provider-model-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@ApiTags('Providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  @ApiOperation({ summary: 'List all video generation providers in catalogue' })
  @ApiQuery({ name: 'all', required: false, type: Boolean, description: 'Include disabled providers (admin only view)' })
  @ApiResponse({ status: 200, type: [ProviderResponseDto] })
  public async getProviders(
    @Query('all') all?: string,
  ): Promise<ProviderResponseDto[]> {
    const onlyEnabled = all !== 'true';
    return this.providersService.findAllProviders(onlyEnabled);
  }

  @Get(':providerId')
  @ApiOperation({ summary: 'Get provider metadata by providerId' })
  @ApiResponse({ status: 200, type: ProviderResponseDto })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  public async getProvider(
    @Param('providerId') providerId: string,
  ): Promise<ProviderResponseDto> {
    return this.providersService.findProviderById(providerId);
  }

  @Get(':providerId/models')
  @ApiOperation({ summary: 'List available models for a specific provider' })
  @ApiQuery({ name: 'all', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [ProviderModelResponseDto] })
  public async getModels(
    @Param('providerId') providerId: string,
    @Query('all') all?: string,
  ): Promise<ProviderModelResponseDto[]> {
    const onlyEnabled = all !== 'true';
    return this.providersService.findAllModels(providerId, onlyEnabled);
  }

  @Get(':providerId/models/:modelId')
  @ApiOperation({ summary: 'Get specific model capabilities and limits' })
  @ApiResponse({ status: 200, type: ProviderModelResponseDto })
  @ApiResponse({ status: 404, description: 'Model not found' })
  public async getModel(
    @Param('providerId') providerId: string,
    @Param('modelId') modelId: string,
  ): Promise<ProviderModelResponseDto> {
    return this.providersService.findModel(providerId, modelId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] Register a new provider in catalog' })
  @ApiResponse({ status: 201, type: ProviderResponseDto })
  public async createProvider(
    @Body() dto: CreateProviderDto,
  ): Promise<ProviderResponseDto> {
    return this.providersService.createProvider(dto);
  }

  @Patch(':providerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Admin] Update provider settings & quota policy' })
  @ApiResponse({ status: 200, type: ProviderResponseDto })
  public async updateProvider(
    @Param('providerId') providerId: string,
    @Body() dto: UpdateProviderDto,
  ): Promise<ProviderResponseDto> {
    return this.providersService.updateProvider(providerId, dto);
  }

  @Post(':providerId/models')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] Add a model to a provider' })
  @ApiResponse({ status: 201, type: ProviderModelResponseDto })
  public async createModel(
    @Param('providerId') providerId: string,
    @Body() dto: CreateProviderModelDto,
  ): Promise<ProviderModelResponseDto> {
    return this.providersService.createModel(providerId, dto);
  }

  @Patch(':providerId/models/:modelId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Admin] Update model metadata or pricing' })
  @ApiResponse({ status: 200, type: ProviderModelResponseDto })
  public async updateModel(
    @Param('providerId') providerId: string,
    @Param('modelId') modelId: string,
    @Body() dto: UpdateProviderModelDto,
  ): Promise<ProviderModelResponseDto> {
    return this.providersService.updateModel(providerId, modelId, dto);
  }

  @Delete(':providerId/models/:modelId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Admin] Remove a model from a provider' })
  @ApiResponse({ status: 200 })
  public async deleteModel(
    @Param('providerId') providerId: string,
    @Param('modelId') modelId: string,
  ): Promise<{ message: string }> {
    return this.providersService.deleteModel(providerId, modelId);
  }
}

