import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectsService } from './projects.service';
import { ProjectsRepository } from './projects.repository';
import {
  AspectRatio,
  ProjectStatus,
  VideoProjectDocument,
} from './schemas/project.schema';
import { SceneStatus, VideoSceneDocument } from './schemas/scene.schema';

describe('ProjectsService', () => {
  let service: ProjectsService;
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
    providerConnectionId: null,
    modelId: 'gen-3-alpha-turbo',
    totalDurationSeconds: 0,
    scenesCount: 0,
    scriptApproved: false,
    finalVideoUrl: null,
    thumbnailUrl: null,
    errorMessage: '',
    metadata: {},
    createdAt: new Date(),
  } as unknown as VideoProjectDocument;

  const mockScene = {
    _id: { toString: () => new Types.ObjectId().toString() },
    projectId: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userId),
    sceneNumber: 1,
    narration: 'Rain drops fallen on neon glass',
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
      findAllForUser: jest.fn().mockResolvedValue([mockProject]),
      countForUser: jest.fn().mockResolvedValue(1),
      findByIdAndUser: jest.fn().mockResolvedValue(mockProject),
      create: jest.fn().mockResolvedValue(mockProject),
      updateByIdAndUser: jest.fn().mockResolvedValue(mockProject),
      deleteByIdAndUser: jest.fn().mockResolvedValue(true),
      findScenesForProject: jest.fn().mockResolvedValue([mockScene]),
      createScenes: jest.fn().mockResolvedValue([mockScene]),
      replaceScenesForProject: jest.fn().mockResolvedValue([mockScene]),
      updateScene: jest.fn().mockResolvedValue(mockScene),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: ProjectsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    repository = module.get(ProjectsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a project with auto-generated title if none provided', async () => {
      const result = await service.create(userId, {
        prompt: 'Exploring deep underwater sea hydrothermal vents',
      });
      expect(result.title).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ProjectStatus.DRAFT,
          prompt: 'Exploring deep underwater sea hydrothermal vents',
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns project with scenes', async () => {
      const result = await service.findOne(projectId, userId);
      expect(result.id).toBe(projectId);
      expect(result.scenes).toHaveLength(1);
    });

    it('throws NotFoundException if project missing', async () => {
      repository.findByIdAndUser.mockResolvedValueOnce(null);
      await expect(service.findOne('missing-id', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateTransition', () => {
    it('allows valid state machine transition', () => {
      expect(() =>
        service.validateTransition(
          ProjectStatus.DRAFT,
          ProjectStatus.SCRIPT_GENERATING,
        ),
      ).not.toThrow();
    });

    it('rejects invalid state machine transition', () => {
      expect(() =>
        service.validateTransition(
          ProjectStatus.DRAFT,
          ProjectStatus.COMPLETED,
        ),
      ).toThrow(BadRequestException);
    });
  });

  describe('duplicate', () => {
    it('duplicates project and its scenes', async () => {
      const result = await service.duplicate(projectId, userId);
      expect(result.id).toBe(projectId);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Future Cyberpunk City (Copy)',
          status: ProjectStatus.DRAFT,
        }),
      );
    });
  });
});

