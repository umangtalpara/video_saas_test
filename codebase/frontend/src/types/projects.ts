export type ProjectStatus =
  | 'draft'
  | 'script_generating'
  | 'awaiting_approval'
  | 'queued'
  | 'generating'
  | 'rendering'
  | 'completed'
  | 'failed';

export type AspectRatio = '9:16' | '16:9' | '1:1';

export type SceneStatus =
  | 'draft'
  | 'queued'
  | 'generating'
  | 'completed'
  | 'failed';

export interface VideoScene {
  id: string;
  projectId: string;
  sceneNumber: number;
  narration: string;
  visualPrompt: string;
  negativePrompt?: string;
  plannedDurationSeconds: number;
  providerId: string;
  modelId: string;
  generationMode: string;
  continuityNotes?: string;
  transition?: string;
  status: SceneStatus;
  videoAssetUrl?: string | null;
  thumbnailUrl?: string | null;
  actualDurationSeconds?: number;
  resolution?: string;
}

export interface VideoProject {
  id: string;
  title: string;
  prompt: string;
  targetDurationSeconds: number;
  aspectRatio: AspectRatio;
  language: string;
  style: string;
  status: ProjectStatus;
  providerId: string;
  providerConnectionId?: string | null;
  modelId: string;
  totalDurationSeconds: number;
  scenesCount: number;
  scriptApproved: boolean;
  finalVideoUrl?: string | null;
  thumbnailUrl?: string | null;
  errorMessage?: string;
  scenes?: VideoScene[];
  createdAt?: string;
}

export interface CreateProjectInput {
  title?: string;
  prompt: string;
  targetDurationSeconds?: number;
  aspectRatio?: AspectRatio;
  language?: string;
  style?: string;
  providerId?: string;
  providerConnectionId?: string;
  modelId?: string;
}

export interface UpdateProjectInput {
  title?: string;
  prompt?: string;
  targetDurationSeconds?: number;
  aspectRatio?: AspectRatio;
  language?: string;
  style?: string;
  providerId?: string;
  providerConnectionId?: string;
  modelId?: string;
}

export interface UpdateSceneItemInput {
  sceneNumber: number;
  narration: string;
  visualPrompt: string;
  negativePrompt?: string;
  plannedDurationSeconds?: number;
  continuityNotes?: string;
  transition?: string;
}

