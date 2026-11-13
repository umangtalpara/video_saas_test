import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AspectRatio, ProjectStatus } from './schemas/project.schema';
import { ProjectResponseDto } from './dto/project-response.dto';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: jest.Mocked<ProjectsService>;

  const userId = 'user-123';
  const projectId = 'proj-456';

  const mockProjectResponse: ProjectResponseDto = {
    id: projectId,
    title: 'Future Cyberpunk City',
    prompt: 'A cinematic drone flight over a rainy neon-lit Tokyo in 2099',
    targetDurationSeconds: 30,
    aspectRatio: AspectRatio.PORTRAIT,
    language: 'en',
    style: 'cinematic',
    status: ProjectStatus.DRAFT,
    providerId: 'runway',
    providerConnectionId: null,
    modelId: 'gen-3-alpha-turbo',
    totalDurationSeconds: 0,
    scenesCount: 0,
    scriptApproved: false,
    finalVideoUrl: null,
    thumbnailUrl: null,
    errorMessage: '',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn().mockResolvedValue({
        data: [mockProjectResponse],
        total: 1,
        page: 1,
        limit: 10,
      }),
      findOne: jest.fn().mockResolvedValue(mockProjectResponse),
      create: jest.fn().mockResolvedValue(mockProjectResponse),
      update: jest.fn().mockResolvedValue(mockProjectResponse),
      delete: jest.fn().mockResolvedValue({ message: 'Deleted' }),
      duplicate: jest.fn().mockResolvedValue(mockProjectResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: mockService }],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get(ProjectsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProjects', () => {
    it('returns paginated projects for user', async () => {
      const result = await controller.getProjects(userId, { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalledWith(userId, { page: 1, limit: 10 });
    });
  });

  describe('createProject', () => {
    it('creates project', async () => {
      const result = await controller.createProject(userId, {
        prompt: 'Futuristic city',
      });
      expect(result.id).toBe(projectId);
      expect(service.create).toHaveBeenCalledWith(userId, {
        prompt: 'Futuristic city',
      });
    });
  });

  describe('getProject', () => {
    it('returns project by id', async () => {
      const result = await controller.getProject(userId, projectId);
      expect(result.id).toBe(projectId);
    });
  });

  describe('duplicateProject', () => {
    it('duplicates project', async () => {
      const result = await controller.duplicateProject(userId, projectId);
      expect(result.id).toBe(projectId);
      expect(service.duplicate).toHaveBeenCalledWith(projectId, userId);
    });
  });
});

