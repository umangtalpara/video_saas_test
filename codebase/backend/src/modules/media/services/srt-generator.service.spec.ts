import { SrtGeneratorService } from './srt-generator.service';
import { VideoSceneDocument } from '../../projects/schemas/scene.schema';

describe('SrtGeneratorService', () => {
  let service: SrtGeneratorService;

  beforeEach(() => {
    service = new SrtGeneratorService();
  });

  describe('formatSrtTime', () => {
    it('should format seconds into HH:MM:SS,mmm string', () => {
      expect(SrtGeneratorService.formatSrtTime(0)).toBe('00:00:00,000');
      expect(SrtGeneratorService.formatSrtTime(5.5)).toBe('00:00:05,500');
      expect(SrtGeneratorService.formatSrtTime(65.123)).toBe('00:01:05,123');
      expect(SrtGeneratorService.formatSrtTime(3661)).toBe('01:01:01,000');
    });
  });

  describe('generateSrtContent', () => {
    it('should generate valid numbered SRT block with timestamps', () => {
      const mockScenes = [
        {
          sceneNumber: 1,
          plannedDurationSeconds: 5,
          narration: 'Welcome to the future of AI video.',
          visualPrompt: 'Cityscape',
        },
        {
          sceneNumber: 2,
          plannedDurationSeconds: 4,
          narration: 'Every frame rendered in real time.',
          visualPrompt: 'Server room',
        },
      ] as VideoSceneDocument[];

      const srt = service.generateSrtContent(mockScenes);

      expect(srt).toContain('1\n00:00:00,000 --> 00:00:05,000\nWelcome to the future of AI video.');
      expect(srt).toContain('2\n00:00:05,000 --> 00:00:09,000\nEvery frame rendered in real time.');
    });

    it('should fallback to visualPrompt when narration is empty', () => {
      const mockScenes = [
        {
          sceneNumber: 1,
          plannedDurationSeconds: 3,
          narration: '',
          visualPrompt: 'Drone swoops through mountains',
        },
      ] as VideoSceneDocument[];

      const srt = service.generateSrtContent(mockScenes);
      expect(srt).toContain('Drone swoops through mountains');
    });
  });
});

