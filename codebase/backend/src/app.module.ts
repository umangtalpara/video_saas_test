import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { LoggingModule } from './logging/logging.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './modules/users/users.module';
import { MailModule } from './modules/mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { ProviderConnectionsModule } from './modules/provider-connections/provider-connections.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { MediaModule } from './modules/media/media.module';
import { GenerationModule } from './modules/generation/generation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    ScheduleModule.forRoot(),
    LoggingModule,
    DatabaseModule,
    HealthModule,
    UsersModule,
    MailModule,
    AuthModule,
    ProvidersModule,
    ProviderConnectionsModule,
    ProjectsModule,
    MediaModule,
    GenerationModule,
  ],
})
export class AppModule {}
