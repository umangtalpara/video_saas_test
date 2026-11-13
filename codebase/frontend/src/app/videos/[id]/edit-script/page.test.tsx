import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditScriptPage from './page';
import * as projectsApi from '../../../../lib/api/projects';
import { VideoProject } from '../../../../types/projects';

jest.mock('../../../../lib/api/projects');
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'proj-123' }),
  useRouter: () => ({ push: mockPush }),
}));

describe('EditScriptPage', () => {
  const mockProject: VideoProject = {
    id: 'proj-123',
    title: 'Future Cyberpunk City',
    prompt: 'Tokyo neon cyberpunk',
    targetDurationSeconds: 10,
    aspectRatio: '9:16',
    language: 'en',
    style: 'cinematic',
    status: 'awaiting_approval',
    providerId: 'runway',
    modelId: 'gen-3-alpha-turbo',
    totalDurationSeconds: 10,
    scenesCount: 2,
    scriptApproved: false,
    scenes: [
      {
        id: 'scene-1',
        projectId: 'proj-123',
        sceneNumber: 1,
        narration: 'Rain drops on neon glass',
        visualPrompt: 'Drone shot of neon skyscrapers',
        plannedDurationSeconds: 5,
        providerId: 'runway',
        modelId: 'gen-3-alpha-turbo',
        generationMode: 'text_to_video',
        status: 'draft',
      },
      {
        id: 'scene-2',
        projectId: 'proj-123',
        sceneNumber: 2,
        narration: 'Flying cars sweep through misty night',
        visualPrompt: 'Tracking shot of flying vehicle',
        plannedDurationSeconds: 5,
        providerId: 'runway',
        modelId: 'gen-3-alpha-turbo',
        generationMode: 'text_to_video',
        status: 'draft',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (projectsApi.fetchProject as jest.Mock).mockResolvedValue(mockProject);
    (projectsApi.updateProjectScript as jest.Mock).mockResolvedValue(mockProject);
    (projectsApi.approveProjectScript as jest.Mock).mockResolvedValue({
      ...mockProject,
      status: 'queued',
      scriptApproved: true,
    });
  });

  it('renders project title and scenes', async () => {
    render(<EditScriptPage />);

    await waitFor(() => {
      expect(screen.getByText('Future Cyberpunk City')).toBeInTheDocument();
      expect(screen.getByText('Scene 1')).toBeInTheDocument();
      expect(screen.getByText('Scene 2')).toBeInTheDocument();
      expect(screen.getByText('10s')).toBeInTheDocument();
    });
  });

  it('allows adding a new scene', async () => {
    render(<EditScriptPage />);

    await waitFor(() => {
      expect(screen.getByText('Scene 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Add Scene'));

    await waitFor(() => {
      expect(screen.getByText('Scene 3')).toBeInTheDocument();
      expect(screen.getByText('15s')).toBeInTheDocument();
    });
  });

  it('allows approving script and queues project', async () => {
    render(<EditScriptPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Approve & Queue Video/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Approve & Queue Video/i }));

    await waitFor(() => {
      expect(projectsApi.updateProjectScript).toHaveBeenCalledWith(
        'proj-123',
        expect.any(Array),
      );
      expect(projectsApi.approveProjectScript).toHaveBeenCalledWith('proj-123');
    });
  });
});
