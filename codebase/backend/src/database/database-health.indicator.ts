import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {
    super();
  }

  public async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isConnected = this.connection.readyState === 1;
    const result = this.getStatus(key, isConnected, {
      readyState: this.connection.readyState,
    });

    if (isConnected) {
      return result;
    }
    throw new HealthCheckError('Database connection is not ready', result);
  }
}

