import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectsScriptService } from './projects-script.service';
import { AspectRatio, ProjectStatus } from './schemas/project.schema';
import { ProjectResponseDto } from './dto/project-response.dto';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: jest.Mocked<ProjectsService>;
  let scriptService: jest.Mocked<ProjectsScriptService>;

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

    const mockScriptService = {
      generateScript: jest.fn().mockResolvedValue({
        ...mockProjectResponse,
        status: ProjectStatus.AWAITING_APPROVAL,
      }),
      updateScript: jest.fn().mockResolvedValue(mockProjectResponse),
      approveScript: jest.fn().mockResolvedValue({
        ...mockProjectResponse,
        status: ProjectStatus.QUEUED,
        scriptApproved: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: ProjectsService, useValue: mockService },
        { provide: ProjectsScriptService, useValue: mockScriptService },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get(ProjectsService);
    scriptService = module.get(ProjectsScriptService);
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

  describe('generateScript', () => {
    it('triggers script generation', async () => {
      const result = await controller.generateScript(userId, projectId, {});
      expect(result.status).toBe(ProjectStatus.AWAITING_APPROVAL);
      expect(scriptService.generateScript).toHaveBeenCalledWith(
        projectId,
        userId,
        {},
      );
    });
  });

  describe('approveScript', () => {
    it('approves script and queues project', async () => {
      const result = await controller.approveScript(userId, projectId);
      expect(result.status).toBe(ProjectStatus.QUEUED);
      expect(scriptService.approveScript).toHaveBeenCalledWith(
        projectId,
        userId,
      );
    });
  });
});
