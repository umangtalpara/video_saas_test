import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseConfig, RootConfig } from '../config/configuration';
import { DatabaseHealthIndicator } from './database-health.indicator';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<RootConfig, true>) => {
        const dbConfig = configService.get<DatabaseConfig>('database', {
          infer: true,
        });
        return {
          uri: dbConfig.uri,
          maxPoolSize: dbConfig.maxPoolSize,
          serverSelectionTimeoutMS: dbConfig.serverSelectionTimeoutMS,
          autoIndex: process.env['NODE_ENV'] !== 'production',
        };
      },
    }),
  ],
  providers: [DatabaseHealthIndicator],
  exports: [MongooseModule, DatabaseHealthIndicator],
})
export class DatabaseModule {}

