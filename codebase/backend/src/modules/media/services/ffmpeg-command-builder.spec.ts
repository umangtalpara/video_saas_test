import { FFmpegCommandBuilder } from './ffmpeg-command-builder';

describe('FFmpegCommandBuilder', () => {
  describe('getDimensions', () => {
    it('should return 1280x720 for 16:9', () => {
      const dim = FFmpegCommandBuilder.getDimensions('16:9');
      expect(dim.width).toBe(1280);
      expect(dim.height).toBe(720);
    });

    it('should return 720x1280 for 9:16', () => {
      const dim = FFmpegCommandBuilder.getDimensions('9:16');
      expect(dim.width).toBe(720);
      expect(dim.height).toBe(1280);
    });

    it('should return 1080x1080 for 1:1', () => {
      const dim = FFmpegCommandBuilder.getDimensions('1:1');
      expect(dim.width).toBe(1080);
      expect(dim.height).toBe(1080);
    });
  });

  describe('buildNormalizeArgs', () => {
    it('should produce video and audio normalization arguments', () => {
      const args = FFmpegCommandBuilder.buildNormalizeArgs('/in.mp4', '/out.mp4', '16:9');
      expect(args).toContain('-i');
      expect(args).toContain('/in.mp4');
      expect(args).toContain('libx264');
      expect(args).toContain('aac');
      expect(args[args.length - 1]).toBe('/out.mp4');
    });
  });

  describe('buildConcatListFile', () => {
    it('should format file paths for concat demuxer', () => {
      const content = FFmpegCommandBuilder.buildConcatListFile(['/clip1.mp4', '/clip2.mp4']);
      expect(content).toBe("file '/clip1.mp4'\nfile '/clip2.mp4'");
    });
  });

  describe('buildConcatArgs', () => {
    it('should build concat arguments', () => {
      const args = FFmpegCommandBuilder.buildConcatArgs('/list.txt', '/out.mp4');
      expect(args).toContain('concat');
      expect(args).toContain('/list.txt');
      expect(args).toContain('/out.mp4');
    });
  });

  describe('buildSubtitleBurnArgs', () => {
    it('should escape colon for subtitles filter', () => {
      const args = FFmpegCommandBuilder.buildSubtitleBurnArgs('/in.mp4', 'C:\\work\\sub.srt', '/out.mp4');
      const filterArg = args.find((a) => a.startsWith('subtitles='));
      expect(filterArg).toBeDefined();
      expect(filterArg).toContain('C\\:/work/sub.srt');
    });
  });

  describe('buildThumbnailArgs', () => {
    it('should build single frame thumbnail extraction arguments', () => {
      const args = FFmpegCommandBuilder.buildThumbnailArgs('/in.mp4', '/thumb.jpg', 2);
      expect(args).toContain('-ss');
      expect(args).toContain('2');
      expect(args).toContain('-vframes');
      expect(args).toContain('1');
    });
  });
});
