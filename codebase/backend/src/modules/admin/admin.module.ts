import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  VideoProject,
  VideoProjectSchema,
} from '../projects/schemas/project.schema';
import {
  ProviderUsage,
  ProviderUsageSchema,
} from '../usage/schemas/provider-usage.schema';
import { ProvidersModule } from '../providers/providers.module';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: User.name, schema: UserSchema },
      { name: VideoProject.name, schema: VideoProjectSchema },
      { name: ProviderUsage.name, schema: ProviderUsageSchema },
    ]),
    ProvidersModule,
  ],
  controllers: [AdminController],
  providers: [AdminRepository, AdminService],
  exports: [AdminRepository, AdminService],
})
export class AdminModule {}
