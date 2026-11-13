import { HealthCheckError } from '@nestjs/terminus';
import { Connection } from 'mongoose';
import { DatabaseHealthIndicator } from './database-health.indicator';

describe('DatabaseHealthIndicator', () => {
  it('should return healthy status when readyState is 1 (connected)', async () => {
    const mockConnection = {
      readyState: 1,
    } as unknown as Connection;

    const indicator = new DatabaseHealthIndicator(mockConnection);
    const result = await indicator.isHealthy('mongodb');

    expect(result).toEqual({
      mongodb: {
        status: 'up',
        readyState: 1,
      },
    });
  });

  it('should throw HealthCheckError when readyState is not 1', async () => {
    const mockConnection = {
      readyState: 0, // disconnected
    } as unknown as Connection;

    const indicator = new DatabaseHealthIndicator(mockConnection);

    await expect(indicator.isHealthy('mongodb')).rejects.toThrow(
      HealthCheckError,
    );
  });
});

