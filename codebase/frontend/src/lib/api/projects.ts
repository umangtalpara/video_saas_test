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

