import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { GenerationController } from './generation.controller';
import { GenerationQueueService } from './services/generation-queue.service';
import { ProjectsRepository } from '../projects/projects.repository';
import { ProjectStatus } from '../projects/schemas/project.schema';
import { SceneStatus } from '../projects/schemas/scene.schema';

describe('GenerationController', () => {
  let controller: GenerationController;
  let mockQueueService: Partial<GenerationQueueService>;
  let mockProjectsRepository: Partial<ProjectsRepository>;

  const userId = new Types.ObjectId().toString();
  const projectId = new Types.ObjectId().toString();
  const sceneId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockQueueService = {
      startProjectGeneration: jest.fn().mockResolvedValue(undefined),
      retryScene: jest.fn().mockResolvedValue(undefined),
      cancelProject: jest.fn().mockResolvedValue(undefined),
    };

    mockProjectsRepository = {
      findByIdAndUser: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(projectId),
        status: ProjectStatus.GENERATING,
      }),
      findScenesForProject: jest.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(sceneId),
          sceneNumber: 1,
          status: SceneStatus.COMPLETED,
          videoAssetUrl: 'https://s3.aws/clip.mp4',
          errorMessage: '',
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenerationController],
      providers: [
        { provide: GenerationQueueService, useValue: mockQueueService },
        { provide: ProjectsRepository, useValue: mockProjectsRepository },
      ],
    }).compile();

    controller = module.get<GenerationController>(GenerationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should queue project generation', async () => {
    const res = await controller.generateProject(projectId, userId);
    expect(res.status).toBe('queued');
    expect(mockQueueService.startProjectGeneration).toHaveBeenCalledWith(projectId, userId);
  });

  it('should retry failed scene', async () => {
    const res = await controller.retryScene(projectId, sceneId, userId);
    expect(res.sceneId).toBe(sceneId);
    expect(mockQueueService.retryScene).toHaveBeenCalledWith(projectId, sceneId, userId);
  });

  it('should cancel generation', async () => {
    const res = await controller.cancelGeneration(projectId, userId);
    expect(res.projectId).toBe(projectId);
    expect(mockQueueService.cancelProject).toHaveBeenCalledWith(projectId, userId);
  });

  it('should return generation status and scene progress', async () => {
    const res = await controller.getGenerationStatus(projectId, userId);
    expect(res.projectId).toBe(projectId);
    expect(res.progressPercent).toBe(100);
    expect(res.completedScenes).toBe(1);
    expect(res.scenes.length).toBe(1);
  });
});

