import { Injectable } from '@nestjs/common';
import { VideoProjectDocument } from './schemas/project.schema';
import { SceneStatus, VideoScene } from './schemas/scene.schema';

export interface PlannedScene {
  sceneNumber: number;
  narration: string;
  visualPrompt: string;
  negativePrompt: string;
  plannedDurationSeconds: number;
  providerId: string;
  modelId: string;
  generationMode: string;
  continuityNotes: string;
  transition: string;
  status: SceneStatus;
}

const NARRATION_TEMPLATES = [
  'In the beginning, {subject} unfolds with quiet intensity as light breaks across the scene.',
  'As the journey continues, {subject} gains momentum, revealing unexpected layers of detail.',
  'At the peak moment, {subject} transforms dramatically with cinematic visual flair.',
  'The perspective widens, emphasizing the scale and atmosphere of {subject}.',
  'Dynamic motion sweeps across {subject}, capturing every reflection and nuance.',
  'Finally, the scene gently resolves, leaving a lingering impression of {subject}.',
];

const VISUAL_ANGLES = [
  'Cinematic wide establishing shot, atmospheric volumetric lighting, slow smooth tracking camera, 8k resolution, photorealistic',
  'Dynamic medium tracking shot with subtle shallow depth of field, natural motion blur, hyper-detailed textures',
  'Close-up dramatic focus on intricate details, glowing reflections, cinematic anamorphic lens bokeh',
  'Low-angle sweeping panoramic shot moving forward, immersive dramatic lighting, high production value',
  'Overhead aerial drone shot descending gently, smooth gimbal movement, cinematic color grading',
  'Cinematic resolution hero shot, camera pulling back gradually, epic golden hour lighting',
];

@Injectable()
export class ScriptPlannerService {
  public planScenes(
    project: VideoProjectDocument,
    additionalInstructions?: string,
  ): PlannedScene[] {
    const targetDuration = project.targetDurationSeconds || 30;
    const clipDuration = 5; // standard clip length for Gen-3 / Ray-2
    const sceneCount = Math.max(1, Math.round(targetDuration / clipDuration));

    const promptText = project.prompt.trim();
    const style = project.style || 'cinematic';
    const aspect = project.aspectRatio || '9:16';
    const instructions = additionalInstructions ? ` (${additionalInstructions})` : '';

    const scenes: PlannedScene[] = [];

    for (let i = 1; i <= sceneCount; i++) {
      const templateIdx = (i - 1) % NARRATION_TEMPLATES.length;
      const angleIdx = (i - 1) % VISUAL_ANGLES.length;

      const narrationTemplate = NARRATION_TEMPLATES[templateIdx] || '';
      const visualAngle = VISUAL_ANGLES[angleIdx] || '';

      const narration = narrationTemplate.replace(
        '{subject}',
        promptText.slice(0, 80),
      );

      const visualPrompt = `${visualAngle}. Subject: ${promptText}. Style: ${style}. Aspect: ${aspect}${instructions}.`;
      const negativePrompt =
        'blurry, low quality, distorted, extra limbs, watermark, text artifacts, bad anatomy';

      const transition = i === 1 ? 'none' : i === sceneCount ? 'fade' : 'dissolve';
      const continuityNotes =
        i === 1
          ? 'Establish setting and lighting palette'
          : `Match camera direction and color tone with scene ${i - 1}`;

      scenes.push({
        sceneNumber: i,
        narration,
        visualPrompt,
        negativePrompt,
        plannedDurationSeconds: clipDuration,
        providerId: project.providerId || 'runway',
        modelId: project.modelId || 'gen-3-alpha-turbo',
        generationMode: 'text_to_video',
        continuityNotes,
        transition,
        status: SceneStatus.DRAFT,
      });
    }

    return scenes;
  }
}

