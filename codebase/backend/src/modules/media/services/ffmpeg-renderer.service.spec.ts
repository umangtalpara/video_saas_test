import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FFmpegRendererService } from './ffmpeg-renderer.service';

describe('FFmpegRendererService', () => {
  let service: FFmpegRendererService;
  let tempDir: string;

  beforeEach(async () => {
    service = new FFmpegRendererService();
    tempDir = path.join(os.tmpdir(), `test-ffmpeg-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('concatenateClips in simulated environment', () => {
    it('should create output video file', async () => {
      const clip1 = path.join(tempDir, 'c1.mp4');
      const clip2 = path.join(tempDir, 'c2.mp4');
      const listPath = path.join(tempDir, 'list.txt');
      const outPath = path.join(tempDir, 'out.mp4');

      await fs.writeFile(clip1, 'clip1_data');
      await fs.writeFile(clip2, 'clip2_data');

      const result = await service.concatenateClips([clip1, clip2], listPath, outPath);
      expect(result).toBe(outPath);

      const exists = await fs.stat(outPath);
      expect(exists.isFile()).toBe(true);
    });
  });

  describe('burnSubtitles in simulated environment', () => {
    it('should create burned subtitle output file', async () => {
      const inPath = path.join(tempDir, 'in.mp4');
      const srtPath = path.join(tempDir, 'sub.srt');
      const outPath = path.join(tempDir, 'burned.mp4');

      await fs.writeFile(inPath, 'video_data');
      await fs.writeFile(srtPath, '1\n00:00:00,000 --> 00:00:02,000\nHello');

      const result = await service.burnSubtitles(inPath, srtPath, outPath);
      expect(result).toBe(outPath);

      const exists = await fs.stat(outPath);
      expect(exists.isFile()).toBe(true);
    });
  });

  describe('extractThumbnail in simulated environment', () => {
    it('should create image thumbnail output file', async () => {
      const inPath = path.join(tempDir, 'in.mp4');
      const outPath = path.join(tempDir, 'thumb.jpg');

      await fs.writeFile(inPath, 'video_data');

      const result = await service.extractThumbnail(inPath, outPath, 1);
      expect(result).toBe(outPath);

      const exists = await fs.stat(outPath);
      expect(exists.isFile()).toBe(true);
    });
  });
});
