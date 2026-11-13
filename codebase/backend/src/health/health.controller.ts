import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { DatabaseHealthIndicator } from '../database/database-health.indicator';

export interface LivenessResponse {
  status: string;
  uptime: number;
  timestamp: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly dbHealth: DatabaseHealthIndicator,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe — verifies the HTTP process is responsive' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  public getLive(): LivenessResponse {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — verifies database connectivity and memory' })
  @ApiResponse({ status: 200, description: 'Service is ready to handle traffic' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy or dependencies down' })
  public async getReady(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 1024 * 1024 * 1024),
      () => this.dbHealth.isHealthy('mongodb'),
    ]);
  }
}
