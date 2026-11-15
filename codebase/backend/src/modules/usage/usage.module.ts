import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProviderUsage,
  ProviderUsageSchema,
} from './schemas/provider-usage.schema';
import {
  UserLimits,
  UserLimitsSchema,
} from './schemas/user-limits.schema';
import { UsageRepository } from './usage.repository';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';
import { UsageLimitsGuard } from './guards/usage-limits.guard';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProviderUsage.name, schema: ProviderUsageSchema },
      { name: UserLimits.name, schema: UserLimitsSchema },
    ]),
    forwardRef(() => ProjectsModule),
  ],
  controllers: [UsageController],
  providers: [UsageRepository, UsageService, UsageLimitsGuard],
  exports: [UsageRepository, UsageService, UsageLimitsGuard],
})
export class UsageModule {}

