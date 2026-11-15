import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsageService } from '../usage.service';
import { ProjectsRepository } from '../../projects/projects.repository';

@Injectable()
export class UsageLimitsGuard implements CanActivate {
  constructor(
    private readonly usageService: UsageService,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.sub;
    const projectId = req.params?.id;

    if (!userId || !projectId) {
      return true;
    }

    const project = await this.projectsRepository.findByIdAndUser(projectId, userId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.usageService.validateGenerationEligibility(userId, project);
    return true;
  }
}

