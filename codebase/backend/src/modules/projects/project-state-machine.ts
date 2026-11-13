import { BadRequestException } from '@nestjs/common';
import { ProjectStatus } from './schemas/project.schema';

export const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.DRAFT]: [
    ProjectStatus.DRAFT,
    ProjectStatus.SCRIPT_GENERATING,
    ProjectStatus.FAILED,
  ],
  [ProjectStatus.SCRIPT_GENERATING]: [
    ProjectStatus.AWAITING_APPROVAL,
    ProjectStatus.FAILED,
  ],
  [ProjectStatus.AWAITING_APPROVAL]: [
    ProjectStatus.AWAITING_APPROVAL,
    ProjectStatus.SCRIPT_GENERATING,
    ProjectStatus.QUEUED,
    ProjectStatus.FAILED,
  ],
  [ProjectStatus.QUEUED]: [
    ProjectStatus.GENERATING,
    ProjectStatus.FAILED,
  ],
  [ProjectStatus.GENERATING]: [
    ProjectStatus.RENDERING,
    ProjectStatus.FAILED,
  ],
  [ProjectStatus.RENDERING]: [
    ProjectStatus.COMPLETED,
    ProjectStatus.FAILED,
  ],
  [ProjectStatus.COMPLETED]: [
    ProjectStatus.DRAFT,
  ],
  [ProjectStatus.FAILED]: [
    ProjectStatus.DRAFT,
    ProjectStatus.AWAITING_APPROVAL,
    ProjectStatus.QUEUED,
  ],
};

export function validateProjectTransition(
  current: ProjectStatus,
  next: ProjectStatus,
): void {
  if (current === next) return;
  const allowed = ALLOWED_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    throw new BadRequestException(
      `Invalid status transition from '${current}' to '${next}'`,
    );
  }
}

