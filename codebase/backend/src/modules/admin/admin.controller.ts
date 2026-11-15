import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, UserStatus } from '../users/schemas/user.schema';
import { ProjectStatus } from '../projects/schemas/project.schema';
import { AdminService } from './admin.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ProviderKillswitchDto } from './dto/provider-killswitch.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin system diagnostics and global dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats and provider overview' })
  public async getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all platform users with pagination and status filters' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  public async getUsers(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('status') status?: UserStatus,
  ) {
    return this.adminService.getUsers(
      limit ? parseInt(limit, 10) : 50,
      skip ? parseInt(skip, 10) : 0,
      status,
    );
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Toggle user account suspension or activation' })
  @ApiResponse({ status: 200, description: 'Updated user account' })
  public async updateUserStatus(
    @Param('id') userId: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('email') adminEmail: string,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    return this.adminService.updateUserStatus(
      adminId,
      adminEmail,
      userId,
      dto.status,
      ip,
    );
  }

  @Get('providers')
  @ApiOperation({ summary: 'List all video generation providers in catalogue' })
  @ApiResponse({ status: 200, description: 'Provider catalogue items' })
  public async getProviders() {
    return this.adminService.getProviders();
  }

  @Patch('providers/:id/killswitch')
  @ApiOperation({ summary: 'Emergency killswitch to enable or disable provider globally' })
  @ApiResponse({ status: 200, description: 'Updated provider status' })
  public async toggleProviderKillswitch(
    @Param('id') providerId: string,
    @Body() dto: ProviderKillswitchDto,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('email') adminEmail: string,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    return this.adminService.toggleProviderKillswitch(
      adminId,
      adminEmail,
      providerId,
      dto.isEnabled,
      dto.reason,
      ip,
    );
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Monitor system video generation jobs with failure diagnostics' })
  @ApiResponse({ status: 200, description: 'List of generation jobs' })
  public async getJobs(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('status') status?: ProjectStatus,
  ) {
    return this.adminService.getJobs(
      limit ? parseInt(limit, 10) : 50,
      skip ? parseInt(skip, 10) : 0,
      status,
    );
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'View platform administrative audit trail logs' })
  @ApiResponse({ status: 200, description: 'Paginated audit trail records' })
  public async getAuditLogs(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.getAuditLogs(
      limit ? parseInt(limit, 10) : 50,
      skip ? parseInt(skip, 10) : 0,
    );
  }
}

