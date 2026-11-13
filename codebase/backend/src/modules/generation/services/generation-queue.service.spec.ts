import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { GenerationQueueService } from './generation-queue.service';
import { ProjectsRepository } from '../../projects/projects.repository';
import { SceneProcessorService } from './scene-processor.service';
import { ProjectStatus } from '../../projects/schemas/project.schema';
import { SceneStatus } from '../../projects/schemas/scene.schema';

describe('GenerationQueueService', () => {
  let service: GenerationQueueService;
  let mockProjectsRepository: Partial<ProjectsRepository>;
  let mockSceneProcessor: Partial<SceneProcessorService>;

  const userId = new Types.ObjectId().toString();
  const projectId = new Types.ObjectId().toString();
  const sceneId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockProjectsRepository = {
      findByIdAndUser: jest.fn(),
      findScenesForProject: jest.fn(),
      updateByIdAndUser: jest.fn(),
      updateScene: jest.fn(),
      findProjectsByStatuses: jest.fn().mockResolvedValue([]),
    };

    mockSceneProcessor = {
      executeScene: jest.fn().mockResolvedValue(undefined),
    };

    service = new GenerationQueueService(
      mockProjectsRepository as ProjectsRepository,
      mockSceneProcessor as SceneProcessorService,
    );
  });

  it('should return initial queue stats', () => {
    const stats = service.getQueueStats();
    expect(stats.activeCount).toBe(0);
    expect(stats.maxConcurrency).toBe(2);
  });

  describe('startProjectGeneration', () => {
    it('should throw NotFoundException if project does not exist', async () => {
      (mockProjectsRepository.findByIdAndUser as jest.Mock).mockResolvedValue(null);

      await expect(
        service.startProjectGeneration(projectId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if project has 0 scenes', async () => {
      (mockProjectsRepository.findByIdAndUser as jest.Mock).mockResolvedValue({
        _id: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId),
        status: ProjectStatus.AWAITING_APPROVAL,
      });
      (mockProjectsRepository.findScenesForProject as jest.Mock).mockResolvedValue([]);

      await expect(
        service.startProjectGeneration(projectId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should queue project and uncompleted scenes', async () => {
      (mockProjectsRepository.findByIdAndUser as jest.Mock).mockResolvedValue({
        _id: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId),
        status: ProjectStatus.AWAITING_APPROVAL,
      });
      (mockProjectsRepository.findScenesForProject as jest.Mock).mockResolvedValue([
        {
          _id: new Types.ObjectId(sceneId),
          status: SceneStatus.DRAFT,
          sceneNumber: 1,
        },
      ]);

      await service.startProjectGeneration(projectId, userId);

      expect(mockProjectsRepository.updateByIdAndUser).toHaveBeenCalledWith(
        projectId,
        userId,
        expect.objectContaining({ status: ProjectStatus.QUEUED }),
      );
      expect(mockProjectsRepository.updateScene).toHaveBeenCalledWith(
        sceneId,
        projectId,
        userId,
        expect.objectContaining({ status: SceneStatus.QUEUED }),
      );
    });
  });

  describe('retryScene', () => {
    it('should re-queue scene and set project back to generating if failed', async () => {
      (mockProjectsRepository.findByIdAndUser as jest.Mock).mockResolvedValue({
        _id: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId),
        status: ProjectStatus.FAILED,
      });
      (mockProjectsRepository.findScenesForProject as jest.Mock).mockResolvedValue([
        {
          _id: new Types.ObjectId(sceneId),
          status: SceneStatus.FAILED,
          sceneNumber: 1,
        },
      ]);

      await service.retryScene(projectId, sceneId, userId);

      expect(mockProjectsRepository.updateScene).toHaveBeenCalledWith(
        sceneId,
        projectId,
        userId,
        expect.objectContaining({ status: SceneStatus.QUEUED }),
      );
      expect(mockProjectsRepository.updateByIdAndUser).toHaveBeenCalledWith(
        projectId,
        userId,
        expect.objectContaining({ status: ProjectStatus.GENERATING }),
      );
    });
  });

  describe('cancelProject', () => {
    it('should cancel queued scenes and mark project failed', async () => {
      (mockProjectsRepository.findByIdAndUser as jest.Mock).mockResolvedValue({
        _id: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId),
      });
      (mockProjectsRepository.findScenesForProject as jest.Mock).mockResolvedValue([
        {
          _id: new Types.ObjectId(sceneId),
          status: SceneStatus.QUEUED,
          sceneNumber: 1,
        },
      ]);

      await service.cancelProject(projectId, userId);

      expect(mockProjectsRepository.updateScene).toHaveBeenCalledWith(
        sceneId,
        projectId,
        userId,
        expect.objectContaining({ status: SceneStatus.DRAFT }),
      );
      expect(mockProjectsRepository.updateByIdAndUser).toHaveBeenCalledWith(
        projectId,
        userId,
        expect.objectContaining({ status: ProjectStatus.FAILED }),
      );
    });
  });
});
