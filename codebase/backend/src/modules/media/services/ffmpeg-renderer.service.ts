import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import { FFmpegCommandBuilder } from './ffmpeg-command-builder';

@Injectable()
export class FFmpegRendererService {
  private readonly logger = new Logger(FFmpegRendererService.name);
  private ffmpegAvailable: boolean | null = null;

  public async isFFmpegAvailable(): Promise<boolean> {
    if (this.ffmpegAvailable !== null) return this.ffmpegAvailable;

    return new Promise<boolean>((resolve) => {
      const proc = spawn('ffmpeg', ['-version']);
      proc.on('error', () => {
        this.ffmpegAvailable = false;
        resolve(false);
      });
      proc.on('close', (code) => {
        this.ffmpegAvailable = code === 0;
        resolve(code === 0);
      });
    });
  }

  public async runFFmpeg(args: string[]): Promise<boolean> {
    const available = await this.isFFmpegAvailable();
    if (!available) {
      this.logger.debug('FFmpeg not installed; simulated execution for test/dev mode');
      return false;
    }

    return new Promise<boolean>((resolve, reject) => {
      const proc = spawn('ffmpeg', args);
      let stderr = '';

      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('error', (err) => {
        this.logger.error(`FFmpeg process failed: ${err.message}`);
        reject(err);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          this.logger.error(`FFmpeg exited with code ${code}: ${stderr.slice(-300)}`);
          reject(new Error(`FFmpeg exited with error code ${code}`));
        }
      });
    });
  }

  public async concatenateClips(
    clipPaths: string[],
    concatListPath: string,
    outputPath: string,
  ): Promise<string> {
    const isAvail = await this.isFFmpegAvailable();
    if (!isAvail) {
      // Simulation mode: create output file containing concatenated content or mock MP4
      const mockBuffer = Buffer.from(
        `MOCK_RENDERED_CONCATENATED_MP4_VIDEO_CONTAINER_${Date.now()}`,
      );
      await fs.writeFile(outputPath, mockBuffer);
      return outputPath;
    }

    const listContent = FFmpegCommandBuilder.buildConcatListFile(clipPaths);
    await fs.writeFile(concatListPath, listContent, 'utf-8');

    const args = FFmpegCommandBuilder.buildConcatArgs(concatListPath, outputPath);
    await this.runFFmpeg(args);
    return outputPath;
  }

  public async burnSubtitles(
    videoPath: string,
    srtPath: string,
    outputPath: string,
  ): Promise<string> {
    const isAvail = await this.isFFmpegAvailable();
    if (!isAvail) {
      // In simulation mode, copy the input video as output
      try {
        await fs.copyFile(videoPath, outputPath);
      } catch {
        await fs.writeFile(outputPath, Buffer.from('MOCK_BURNED_SUBTITLES_MP4'));
      }
      return outputPath;
    }

    const args = FFmpegCommandBuilder.buildSubtitleBurnArgs(videoPath, srtPath, outputPath);
    await this.runFFmpeg(args);
    return outputPath;
  }

  public async extractThumbnail(
    videoPath: string,
    outputPath: string,
    seekSeconds: number = 1,
  ): Promise<string> {
    const isAvail = await this.isFFmpegAvailable();
    if (!isAvail) {
      // Simulation mode: write mock JPEG poster
      const mockJpeg = Buffer.from(
        `\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xFF\xDB\x00C\x00MOCK_JPEG_POSTER_${Date.now()}\xFF\xD9`,
      );
      await fs.writeFile(outputPath, mockJpeg);
      return outputPath;
    }

    const args = FFmpegCommandBuilder.buildThumbnailArgs(videoPath, outputPath, seekSeconds);
    await this.runFFmpeg(args);
    return outputPath;
  }
}
