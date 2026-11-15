import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MediaController } from './media.controller';
import { ProjectsRepository } from '../projects/projects.repository';
import { S3StorageService } from './services/s3-storage.service';
import { MediaRepository } from './media.repository';

describe('MediaController', () => {
  let controller: MediaController;
  let mockProjectsRepo: Partial<ProjectsRepository>;
  let mockS3Storage: Partial<S3StorageService>;
  let mockMediaRepo: Partial<MediaRepository>;

  const userId = new Types.ObjectId().toString();
  const projectId = new Types.ObjectId().toString();

  const mockProject = {
    _id: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userId),
    title: 'Neon Cyberpunk Race',
    finalVideoUrl: 'https://cdn.videoforge.ai/render.mp4',
    thumbnailUrl: 'https://cdn.videoforge.ai/thumb.jpg',
  };

  beforeEach(async () => {
    mockProjectsRepo = {
      findByIdAndUser: jest.fn().mockImplementation((pId: string, uId: string) => {
        if (pId === projectId && uId === userId) {
          return Promise.resolve(mockProject);
        }
        return Promise.resolve(null);
      }),
    };

    mockS3Storage = {
      buildFinalVideoKey: jest.fn().mockReturnValue(`users/${userId}/projects/${projectId}/final/render.mp4`),
      generatePresignedGetUrl: jest.fn().mockImplementation((key: string, exp: number, file?: string) =>
        Promise.resolve(`https://presigned.aws/${key}?expires=${exp}${file ? `&file=${file}` : ''}`),
      ),
    };

    mockMediaRepo = {
      findByProject: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        { provide: ProjectsRepository, useValue: mockProjectsRepo },
        { provide: S3StorageService, useValue: mockS3Storage },
        { provide: MediaRepository, useValue: mockMediaRepo },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDownloadUrl', () => {
    it('should generate presigned download URL for valid user project', async () => {
      const res = await controller.getDownloadUrl(projectId, userId);
      expect(res.downloadUrl).toContain('render.mp4');
      expect(res.fileName).toBe('neon_cyberpunk_race.mp4');
      expect(res.expiresInSeconds).toBe(3600);
    });

    it('should throw NotFoundException for non-existent project', async () => {
      await expect(
        controller.getDownloadUrl('non-existent', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPreviewUrl', () => {
    it('should return preview URLs for project video and thumbnail', async () => {
      const res = await controller.getPreviewUrl(projectId, userId);
      expect(res.previewUrl).toContain('render.mp4');
      expect(res.thumbnailUrl).toContain('thumbnail.jpg');
      expect(res.expiresInSeconds).toBe(7200);
    });
  });

  describe('getProjectAssets', () => {
    it('should list stored media assets', async () => {
      const res = await controller.getProjectAssets(projectId, userId);
      expect(Array.isArray(res)).toBe(true);
      expect(mockMediaRepo.findByProject).toHaveBeenCalledWith(projectId, userId);
    });
  });
});

