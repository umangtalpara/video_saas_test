import { Injectable } from '@nestjs/common';
import { VideoSceneDocument } from '../../projects/schemas/scene.schema';

export interface SrtEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

@Injectable()
export class SrtGeneratorService {
  public static formatSrtTime(seconds: number): string {
    const totalMs = Math.round(seconds * 1000);
    const ms = totalMs % 1000;
    const totalSecs = Math.floor(totalMs / 1000);
    const s = totalSecs % 60;
    const totalMins = Math.floor(totalSecs / 60);
    const m = totalMins % 60;
    const h = Math.floor(totalMins / 60);

    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
  }

  public generateSrtContent(scenes: VideoSceneDocument[]): string {
    let currentTime = 0;
    const entries: string[] = [];

    const sortedScenes = [...scenes].sort((a, b) => a.sceneNumber - b.sceneNumber);

    for (let i = 0; i < sortedScenes.length; i++) {
      const scene = sortedScenes[i];
      if (!scene) continue;

      const duration = scene.actualDurationSeconds || scene.plannedDurationSeconds || 5;
      const startTime = currentTime;
      const endTime = currentTime + duration;
      currentTime = endTime;

      const text = (scene.narration && scene.narration.trim().length > 0)
        ? scene.narration.trim()
        : scene.visualPrompt.trim();

      if (!text) continue;

      const startFormatted = SrtGeneratorService.formatSrtTime(startTime);
      const endFormatted = SrtGeneratorService.formatSrtTime(endTime);

      entries.push(`${i + 1}\n${startFormatted} --> ${endFormatted}\n${text}\n`);
    }

    return entries.join('\n');
  }
}
