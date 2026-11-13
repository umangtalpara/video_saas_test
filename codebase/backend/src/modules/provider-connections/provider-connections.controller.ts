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
import { ProviderConnectionsService } from './provider-connections.service';
import { CreateProviderConnectionDto } from './dto/create-provider-connection.dto';
import { UpdateProviderConnectionDto } from './dto/update-provider-connection.dto';
import { ProviderConnectionResponseDto } from './dto/provider-connection-response.dto';
import { TestConnectionResponseDto } from './dto/test-connection-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Provider Connections')
@Controller('provider-connections')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProviderConnectionsController {
  constructor(
    private readonly connectionsService: ProviderConnectionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List current authenticated user's provider connections" })
  @ApiQuery({ name: 'enabledOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [ProviderConnectionResponseDto] })
  public async getConnections(
    @CurrentUser('sub') userId: string,
    @Query('enabledOnly') enabledOnly?: string,
  ): Promise<ProviderConnectionResponseDto[]> {
    return this.connectionsService.findAllForUser(userId, enabledOnly === 'true');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new BYOK provider connection (credentials encrypted at rest)' })
  @ApiResponse({ status: 201, type: ProviderConnectionResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error or invalid providerId' })
  public async createConnection(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateProviderConnectionDto,
  ): Promise<ProviderConnectionResponseDto> {
    return this.connectionsService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single provider connection by ID' })
  @ApiResponse({ status: 200, type: ProviderConnectionResponseDto })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  public async getConnection(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<ProviderConnectionResponseDto> {
    return this.connectionsService.findOneForUser(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update provider connection settings or rotate API key' })
  @ApiResponse({ status: 200, type: ProviderConnectionResponseDto })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  public async updateConnection(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProviderConnectionDto,
  ): Promise<ProviderConnectionResponseDto> {
    return this.connectionsService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a provider connection' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  public async deleteConnection(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.connectionsService.delete(id, userId);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test provider connection connectivity without exposing keys' })
  @ApiResponse({ status: 200, type: TestConnectionResponseDto })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  public async testConnection(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<TestConnectionResponseDto> {
    return this.connectionsService.testConnection(id, userId);
  }
}

