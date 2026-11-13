import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectsScriptService } from './projects-script.service';
import { ProjectsRepository } from './projects.repository';
import { ScriptPlannerService } from './script-planner.service';
import {
  AspectRatio,
  ProjectStatus,
  VideoProjectDocument,
} from './schemas/project.schema';
import { SceneStatus, VideoSceneDocument } from './schemas/scene.schema';

describe('ProjectsScriptService', () => {
  let service: ProjectsScriptService;
  let repository: jest.Mocked<ProjectsRepository>;

  const userId = new Types.ObjectId().toString();
  const projectId = new Types.ObjectId().toString();

  const mockProject = {
    _id: { toString: () => projectId },
    userId: new Types.ObjectId(userId),
    title: 'Future Cyberpunk City',
    prompt: 'A cinematic drone flight over a rainy neon-lit Tokyo in 2099',
    targetDurationSeconds: 30,
    aspectRatio: AspectRatio.PORTRAIT,
    language: 'en',
    style: 'cinematic',
    status: ProjectStatus.DRAFT,
    providerId: 'runway',
    modelId: 'gen-3-alpha-turbo',
    totalDurationSeconds: 0,
    scenesCount: 0,
    scriptApproved: false,
    finalVideoUrl: null,
    thumbnailUrl: null,
    errorMessage: '',
    createdAt: new Date(),
  } as unknown as VideoProjectDocument;

  const mockScene = {
    _id: { toString: () => new Types.ObjectId().toString() },
    projectId: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userId),
    sceneNumber: 1,
    narration: 'Rain falls on neon street',
    visualPrompt: 'Drone shot of neon buildings',
    negativePrompt: '',
    plannedDurationSeconds: 5,
    providerId: 'runway',
    modelId: 'gen-3-alpha-turbo',
    generationMode: 'text_to_video',
    continuityNotes: '',
    transition: 'none',
    status: SceneStatus.DRAFT,
    videoAssetUrl: null,
    thumbnailUrl: null,
    actualDurationSeconds: 0,
    resolution: '1080p',
    createdAt: new Date(),
  } as unknown as VideoSceneDocument;

  beforeEach(async () => {
    const mockRepo = {
      findByIdAndUser: jest.fn().mockResolvedValue({ ...mockProject }),
      updateByIdAndUser: jest.fn().mockImplementation((id, uId, update) => {
        return Promise.resolve({ ...mockProject, ...update });
      }),
      replaceScenesForProject: jest.fn().mockResolvedValue([mockScene]),
      findScenesForProject: jest.fn().mockResolvedValue([mockScene]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsScriptService,
        ScriptPlannerService,
        { provide: ProjectsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ProjectsScriptService>(ProjectsScriptService);
    repository = module.get(ProjectsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateScript', () => {
    it('generates scenes from prompt and moves project to awaiting_approval', async () => {
      const result = await service.generateScript(projectId, userId, {});

      expect(repository.replaceScenesForProject).toHaveBeenCalled();
      expect(result.status).toBe(ProjectStatus.AWAITING_APPROVAL);
      expect(result.scenesCount).toBe(6); // 30s / 5s = 6 scenes
      expect(result.totalDurationSeconds).toBe(30);
    });

    it('throws NotFoundException if project missing', async () => {
      repository.findByIdAndUser.mockResolvedValueOnce(null);
      await expect(
        service.generateScript('unknown-id', userId, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateScript', () => {
    it('allows editing scenes while in awaiting_approval status', async () => {
      repository.findByIdAndUser.mockResolvedValueOnce({
        ...mockProject,
        status: ProjectStatus.AWAITING_APPROVAL,
      } as VideoProjectDocument);

      const result = await service.updateScript(projectId, userId, {
        scenes: [
          {
            sceneNumber: 1,
            narration: 'Custom updated narration',
            visualPrompt: 'Custom prompt',
            plannedDurationSeconds: 6,
          },
        ],
      });

      expect(repository.replaceScenesForProject).toHaveBeenCalled();
      expect(result.status).toBe(ProjectStatus.AWAITING_APPROVAL);
    });

    it('rejects editing if project is already queued or generating', async () => {
      repository.findByIdAndUser.mockResolvedValueOnce({
        ...mockProject,
        status: ProjectStatus.QUEUED,
      } as VideoProjectDocument);

      await expect(
        service.updateScript(projectId, userId, { scenes: [] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveScript', () => {
    it('approves script and transitions project to QUEUED', async () => {
      repository.findByIdAndUser.mockResolvedValueOnce({
        ...mockProject,
        status: ProjectStatus.AWAITING_APPROVAL,
      } as VideoProjectDocument);

      const result = await service.approveScript(projectId, userId);

      expect(result.status).toBe(ProjectStatus.QUEUED);
      expect(result.scriptApproved).toBe(true);
      expect(repository.updateByIdAndUser).toHaveBeenCalledWith(
        projectId,
        userId,
        expect.objectContaining({
          status: ProjectStatus.QUEUED,
          scriptApproved: true,
        }),
      );
    });

    it('rejects approval if project is not in awaiting_approval status', async () => {
      repository.findByIdAndUser.mockResolvedValueOnce({
        ...mockProject,
        status: ProjectStatus.DRAFT,
      } as VideoProjectDocument);

      await expect(service.approveScript(projectId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects approval if project has 0 scenes', async () => {
      repository.findByIdAndUser.mockResolvedValueOnce({
        ...mockProject,
        status: ProjectStatus.AWAITING_APPROVAL,
      } as VideoProjectDocument);
      repository.findScenesForProject.mockResolvedValueOnce([]);

      await expect(service.approveScript(projectId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

