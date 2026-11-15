import { apiClient } from '../api-client';
import {
  CreateProjectInput,
  UpdateProjectInput,
  UpdateSceneItemInput,
  VideoProject,
} from '../../types/projects';

export interface ProjectsListResponse {
  data: VideoProject[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchProjects(query?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<ProjectsListResponse> {
  const response = await apiClient.get<ProjectsListResponse>('/projects', {
    params: query,
  });
  return response.data;
}

export async function fetchProject(id: string): Promise<VideoProject> {
  const response = await apiClient.get<VideoProject>(`/projects/${id}`);
  return response.data;
}

export async function createProject(
  data: CreateProjectInput,
): Promise<VideoProject> {
  const response = await apiClient.post<VideoProject>('/projects', data);
  return response.data;
}

export async function updateProject(
  id: string,
  data: UpdateProjectInput,
): Promise<VideoProject> {
  const response = await apiClient.patch<VideoProject>(`/projects/${id}`, data);
  return response.data;
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/projects/${id}`);
}

export async function duplicateProject(id: string): Promise<VideoProject> {
  const response = await apiClient.post<VideoProject>(
    `/projects/${id}/duplicate`,
  );
  return response.data;
}

export async function generateProjectScript(
  id: string,
  additionalInstructions?: string,
): Promise<VideoProject> {
  const response = await apiClient.post<VideoProject>(
    `/projects/${id}/script/generate`,
    { additionalInstructions },
  );
  return response.data;
}

export async function updateProjectScript(
  id: string,
  scenes: UpdateSceneItemInput[],
): Promise<VideoProject> {
  const response = await apiClient.patch<VideoProject>(
    `/projects/${id}/script`,
    { scenes },
  );
  return response.data;
}

export async function approveProjectScript(id: string): Promise<VideoProject> {
  const response = await apiClient.post<VideoProject>(
    `/projects/${id}/script/approve`,
  );
  return response.data;
}

export interface GenerationStatusResponse {
  projectId: string;
  status: string;
  progressPercent: number;
  scenesCount: number;
  completedScenes: number;
  failedScenes: number;
  scenes: Array<{
    id: string;
    sceneNumber: number;
    status: string;
    videoAssetUrl: string | null;
    errorMessage: string;
  }>;
}

export async function startGeneration(
  id: string,
): Promise<{ message: string; projectId: string; status: string }> {
  const response = await apiClient.post<{
    message: string;
    projectId: string;
    status: string;
  }>(`/projects/${id}/generate`);
  return response.data;
}

export async function retrySceneGeneration(
  projectId: string,
  sceneId: string,
): Promise<{ message: string; sceneId: string }> {
  const response = await apiClient.post<{ message: string; sceneId: string }>(
    `/projects/${projectId}/scenes/${sceneId}/retry`,
  );
  return response.data;
}

export async function cancelProjectGeneration(
  projectId: string,
): Promise<{ message: string; projectId: string }> {
  const response = await apiClient.post<{ message: string; projectId: string }>(
    `/projects/${projectId}/cancel`,
  );
  return response.data;
}

export async function fetchGenerationStatus(
  projectId: string,
): Promise<GenerationStatusResponse> {
  const response = await apiClient.get<GenerationStatusResponse>(
    `/projects/${projectId}/generation-status`,
  );
  return response.data;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  expiresInSeconds: number;
  fileName: string;
}

export interface PreviewUrlResponse {
  previewUrl: string | null;
  thumbnailUrl: string | null;
  expiresInSeconds: number;
}

export async function fetchDownloadUrl(
  projectId: string,
): Promise<DownloadUrlResponse> {
  const response = await apiClient.get<DownloadUrlResponse>(
    `/projects/${projectId}/download-url`,
  );
  return response.data;
}

export async function fetchPreviewUrl(
  projectId: string,
): Promise<PreviewUrlResponse> {
  const response = await apiClient.get<PreviewUrlResponse>(
    `/projects/${projectId}/preview-url`,
  );
  return response.data;
}

export async function retryProjectRender(
  projectId: string,
): Promise<{ message: string; projectId: string; status: string }> {
  const response = await apiClient.post<{
    message: string;
    projectId: string;
    status: string;
  }>(`/projects/${projectId}/generate`);
  return response.data;
}


