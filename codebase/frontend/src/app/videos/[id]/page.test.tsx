import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectDetailsPage from './page';
import * as projectsApi from '../../../lib/api/projects';
import { VideoProject } from '../../../types/projects';

jest.mock('../../../lib/api/projects');
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'proj-123' }),
  useRouter: () => ({ push: mockPush }),
}));

describe('ProjectDetailsPage', () => {
  const mockProject: VideoProject = {
    id: 'proj-123',
    title: 'Future Cyberpunk City',
    prompt: 'Tokyo neon cyberpunk',
    targetDurationSeconds: 10,
    aspectRatio: '16:9',
    language: 'en',
    style: 'cinematic',
    status: 'generating',
    providerId: 'wan',
    modelId: 'wan2.1-t2v-turbo',
    totalDurationSeconds: 10,
    scenesCount: 2,
    scriptApproved: true,
    scenes: [
      {
        id: 'scene-1',
        projectId: 'proj-123',
        sceneNumber: 1,
        narration: 'Rain drops on neon glass',
        visualPrompt: 'Drone shot of neon skyscrapers',
        plannedDurationSeconds: 5,
        actualDurationSeconds: 5,
        providerId: 'wan',
        modelId: 'wan2.1-t2v-turbo',
        generationMode: 'text_to_video',
        status: 'completed',
        videoAssetUrl: 'https://cdn.videoforge.ai/clips/scene1.mp4',
        resolution: '1280x720',
      },
      {
        id: 'scene-2',
        projectId: 'proj-123',
        sceneNumber: 2,
        narration: 'Flying cars sweep through misty night',
        visualPrompt: 'Tracking shot of flying vehicle',
        plannedDurationSeconds: 5,
        providerId: 'wan',
        modelId: 'wan2.1-t2v-turbo',
        generationMode: 'text_to_video',
        status: 'failed',
        errorMessage: 'Quota exhausted on provider',
      },
    ],
  };

  const mockGenStatus: projectsApi.GenerationStatusResponse = {
    projectId: 'proj-123',
    status: 'generating',
    progressPercent: 50,
    scenesCount: 2,
    completedScenes: 1,
    failedScenes: 1,
    scenes: [
      {
        id: 'scene-1',
        sceneNumber: 1,
        status: 'completed',
        videoAssetUrl: 'https://cdn.videoforge.ai/clips/scene1.mp4',
        errorMessage: '',
      },
      {
        id: 'scene-2',
        sceneNumber: 2,
        status: 'failed',
        videoAssetUrl: null,
        errorMessage: 'Quota exhausted on provider',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (projectsApi.fetchProject as jest.Mock).mockResolvedValue(mockProject);
    (projectsApi.fetchGenerationStatus as jest.Mock).mockResolvedValue(mockGenStatus);
    (projectsApi.startGeneration as jest.Mock).mockResolvedValue({
      message: 'Generation started',
      projectId: 'proj-123',
      status: 'queued',
    });
    (projectsApi.retrySceneGeneration as jest.Mock).mockResolvedValue({
      message: 'Scene retry queued',
      sceneId: 'scene-2',
    });
    (projectsApi.cancelProjectGeneration as jest.Mock).mockResolvedValue({
      message: 'Cancelled',
      projectId: 'proj-123',
    });
  });

  it('renders project header and pipeline progress percentage', async () => {
    render(<ProjectDetailsPage />);

    expect(screen.getByText(/Loading project generation dashboard/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Future Cyberpunk City')).toBeInTheDocument();
    });

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 2/i)).toBeInTheDocument();
    expect(screen.getByText('Cancel Project')).toBeInTheDocument();
  });

  it('renders scene status badges and retry button for failed scenes', async () => {
    render(<ProjectDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText('Drone shot of neon skyscrapers')).toBeInTheDocument();
    });

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Retry Scene')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Retry Scene'));

    await waitFor(() => {
      expect(projectsApi.retrySceneGeneration).toHaveBeenCalledWith('proj-123', 'scene-2');
    });
  });

  it('allows cancelling ongoing generation', async () => {
    render(<ProjectDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cancel Project')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel Project'));

    await waitFor(() => {
      expect(projectsApi.cancelProjectGeneration).toHaveBeenCalledWith('proj-123');
    });
  });

  it('opens video clip preview modal on Preview Clip click (FE-002)', async () => {
    render(<ProjectDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText('Preview Clip')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Preview Clip'));

    expect(screen.getByText('Scene #1 Clip Preview')).toBeInTheDocument();
    expect(screen.getByText('MP4 (H.264)')).toBeInTheDocument();
    expect(screen.getByText('Close Preview')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close Preview'));
    expect(screen.queryByText('Scene #1 Clip Preview')).not.toBeInTheDocument();
  });

  it('opens tweak prompt modal and submits regeneration (FE-002)', async () => {
    render(<ProjectDetailsPage />);

    await waitFor(() => {
      const tweakButtons = screen.getAllByText('Tweak Prompt');
      expect(tweakButtons.length).toBeGreaterThan(0);
    });

    const tweakButtons = screen.getAllByText('Tweak Prompt');
    fireEvent.click(tweakButtons[0]!);

    expect(screen.getByText(/Tweak Scene #1 Prompt/i)).toBeInTheDocument();
    expect(screen.getByText('Regenerate Clip')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Regenerate Clip'));

    await waitFor(() => {
      expect(projectsApi.retrySceneGeneration).toHaveBeenCalledWith('proj-123', 'scene-1');
    });
  });
});

