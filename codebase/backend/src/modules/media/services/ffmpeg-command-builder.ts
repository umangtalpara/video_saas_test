export interface VideoDimensions {
  width: number;
  height: number;
}

export class FFmpegCommandBuilder {
  public static getDimensions(aspectRatio: string): VideoDimensions {
    switch (aspectRatio) {
      case '9:16':
        return { width: 720, height: 1280 };
      case '1:1':
        return { width: 1080, height: 1080 };
      case '16:9':
      default:
        return { width: 1280, height: 720 };
    }
  }

  public static buildNormalizeArgs(
    inputPath: string,
    outputPath: string,
    aspectRatio: string = '16:9',
  ): string[] {
    const { width, height } = this.getDimensions(aspectRatio);
    const filter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`;

    return [
      '-y',
      '-i', inputPath,
      '-vf', filter,
      '-r', '30',
      '-pix_fmt', 'yuv420p',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar', '44100',
      outputPath,
    ];
  }

  public static buildConcatListFile(normalizedPaths: string[]): string {
    return normalizedPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  }

  public static buildConcatArgs(listFilePath: string, outputPath: string): string[] {
    return [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFilePath,
      '-c', 'copy',
      outputPath,
    ];
  }

  public static buildAudioMixArgs(
    videoPath: string,
    audioPath: string,
    outputPath: string,
  ): string[] {
    return [
      '-y',
      '-i', videoPath,
      '-i', audioPath,
      '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[aout]',
      '-map', '0:v',
      '-map', '[aout]',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      outputPath,
    ];
  }

  public static buildSubtitleBurnArgs(
    videoPath: string,
    srtPath: string,
    outputPath: string,
  ): string[] {
    // Escape colons and backslashes for FFmpeg filter paths on Windows
    const escapedSrt = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    return [
      '-y',
      '-i', videoPath,
      '-vf', `subtitles='${escapedSrt}':force_style='FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3'`,
      '-c:a', 'copy',
      outputPath,
    ];
  }

  public static buildThumbnailArgs(
    videoPath: string,
    outputPath: string,
    seekSeconds: number = 1,
  ): string[] {
    return [
      '-y',
      '-ss', String(seekSeconds),
      '-i', videoPath,
      '-vframes', '1',
      '-q:v', '2',
      outputPath,
    ];
  }
}
