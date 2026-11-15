import { MediaInspectorService } from './media-inspector.service';

describe('MediaInspectorService', () => {
  let service: MediaInspectorService;

  beforeEach(() => {
    service = new MediaInspectorService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('inspectVideoBuffer', () => {
    it('should return invalid metadata for null or undefined buffer', () => {
      // @ts-expect-error testing null input
      const res = service.inspectVideoBuffer(null);
      expect(res.isValid).toBe(false);
      expect(res.container).toBe('unknown');
      expect(res.durationSeconds).toBe(0);
      expect(res.resolution).toBe('unknown');
      expect(res.codec).toBe('unknown');
    });

    it('should return invalid metadata for buffer shorter than 16 bytes', () => {
      const buffer = Buffer.from('too short');
      const res = service.inspectVideoBuffer(buffer);
      expect(res.isValid).toBe(false);
      expect(res.durationSeconds).toBe(0);
    });

    it('should identify mock MP4 video buffer', () => {
      const buffer = Buffer.from('MOCK_MP4_SIMULATED_VIDEO_DATA_BUFFER');
      const res = service.inspectVideoBuffer(buffer, 8, '1920x1080');
      expect(res.isValid).toBe(true);
      expect(res.container).toBe('mp4');
      expect(res.codec).toBe('h264');
      expect(res.durationSeconds).toBe(8);
      expect(res.resolution).toBe('1920x1080');
    });

    it('should identify MP4 with ftyp signature in header', () => {
      const buffer = Buffer.alloc(32);
      buffer.write('ftyp', 4, 'ascii');
      const res = service.inspectVideoBuffer(buffer);
      expect(res.isValid).toBe(true);
      expect(res.container).toBe('mp4');
      expect(res.codec).toBe('h264');
      expect(res.durationSeconds).toBe(5);
      expect(res.resolution).toBe('1280x720');
    });

    it('should accept binary video buffer larger than 100 bytes', () => {
      const buffer = Buffer.alloc(256, 0x01);
      const res = service.inspectVideoBuffer(buffer);
      expect(res.isValid).toBe(true);
      expect(res.container).toBe('mp4');
    });
  });
});

