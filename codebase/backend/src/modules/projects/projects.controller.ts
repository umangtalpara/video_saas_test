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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: "List current authenticated user's video projects" })
  @ApiResponse({ status: 200, type: [ProjectResponseDto] })
  public async getProjects(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryProjectDto,
  ): Promise<{ data: ProjectResponseDto[]; total: number; page: number; limit: number }> {
    return this.projectsService.findAll(userId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new draft video project' })
  @ApiResponse({ status: 201, type: ProjectResponseDto })
  public async createProject(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details with planned scenes' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  public async getProject(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project settings' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  public async updateProject(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project and its scenes' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Project not found' })
  public async deleteProject(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.projectsService.delete(id, userId);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Duplicate an existing project and its scenes' })
  @ApiResponse({ status: 201, type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  public async duplicateProject(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.duplicate(id, userId);
  }
}

