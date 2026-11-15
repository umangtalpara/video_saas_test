import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsageService } from './usage.service';
import { UpdateLimitsDto } from './dto/update-limits.dto';

@ApiTags('Usage')
@Controller('usage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get current user usage metrics and provider breakdowns' })
  @ApiResponse({ status: 200, description: 'Usage summary data' })
  public async getSummary(@CurrentUser('sub') userId: string) {
    return this.usageService.getUsageSummary(userId);
  }

  @Get('limits')
  @ApiOperation({ summary: 'Get current user generation limits and safety caps' })
  @ApiResponse({ status: 200, description: 'User limits configuration' })
  public async getLimits(@CurrentUser('sub') userId: string) {
    return this.usageService.getEffectiveLimits(userId);
  }

  @Patch('limits')
  @ApiOperation({ summary: 'Update personal generation limits and safety caps' })
  @ApiResponse({ status: 200, description: 'Updated limits configuration' })
  public async updateLimits(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateLimitsDto,
  ) {
    return this.usageService.updateLimits(userId, dto);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get paginated provider call history' })
  @ApiResponse({ status: 200, description: 'Array of provider usage logs' })
  public async getLogs(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedSkip = skip ? parseInt(skip, 10) : 0;
    return this.usageService.getUserLogs(userId, parsedLimit, parsedSkip);
  }
}

