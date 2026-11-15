import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VideoLibraryPage from './page';
import * as projectsApi from '../../lib/api/projects';
import { VideoProject } from '../../types/projects';

jest.mock('../../lib/api/projects');
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('VideoLibraryPage', () => {
  const mockProjects: VideoProject[] = [
    {
      id: 'proj-1',
      title: 'Neon Tokyo Cyberpunk',
      prompt: 'Rainy futuristic Tokyo alley',
      targetDurationSeconds: 30,
      aspectRatio: '16:9',
      language: 'en',
      style: 'cinematic',
      status: 'completed',
      providerId: 'wan',
      modelId: 'wan2.1-t2v-turbo',
      totalDurationSeconds: 30,
      scenesCount: 6,
      scriptApproved: true,
      finalVideoUrl: 'https://cdn.videoforge.ai/final-1.mp4',
      thumbnailUrl: 'https://cdn.videoforge.ai/thumb-1.jpg',
      createdAt: '2026-11-10T12:00:00Z',
    },
    {
      id: 'proj-2',
      title: 'Ocean Deep Exploration',
      prompt: 'Coral reefs and glowing jellyfish',
      targetDurationSeconds: 15,
      aspectRatio: '9:16',
      language: 'en',
      style: 'cinematic',
      status: 'generating',
      providerId: 'runway',
      modelId: 'gen-3-alpha-turbo',
      totalDurationSeconds: 15,
      scenesCount: 3,
      scriptApproved: true,
      createdAt: '2026-11-12T12:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (projectsApi.fetchProjects as jest.Mock).mockResolvedValue({
      data: mockProjects,
      total: 2,
      page: 1,
      limit: 50,
    });
    (projectsApi.fetchDownloadUrl as jest.Mock).mockResolvedValue({
      downloadUrl: 'https://presigned.aws/final-1.mp4',
      fileName: 'neon_tokyo.mp4',
      expiresInSeconds: 3600,
    });
    (projectsApi.duplicateProject as jest.Mock).mockResolvedValue({
      id: 'proj-1-copy',
      title: 'Neon Tokyo Cyberpunk (Copy)',
    });
    (projectsApi.deleteProject as jest.Mock).mockResolvedValue(undefined);
  });

  it('renders video library header and cards', async () => {
    render(<VideoLibraryPage />);

    expect(screen.getByText(/Loading library.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Neon Tokyo Cyberpunk')).toBeInTheDocument();
      expect(screen.getByText('Ocean Deep Exploration')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Generating').length).toBeGreaterThan(0);
  });

  it('filters by status and search input', async () => {
    render(<VideoLibraryPage />);

    await waitFor(() => {
      expect(screen.getByText('Neon Tokyo Cyberpunk')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search videos by title or prompt/i);
    fireEvent.change(searchInput, { target: { value: 'Ocean' } });

    expect(screen.queryByText('Neon Tokyo Cyberpunk')).not.toBeInTheDocument();
    expect(screen.getByText('Ocean Deep Exploration')).toBeInTheDocument();
  });

  it('toggles table view mode', async () => {
    render(<VideoLibraryPage />);

    await waitFor(() => {
      expect(screen.getByText('Neon Tokyo Cyberpunk')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Table'));

    expect(screen.getByText('Project Title')).toBeInTheDocument();
    expect(screen.getByText('Format')).toBeInTheDocument();
  });

  it('triggers download for completed video', async () => {
    render(<VideoLibraryPage />);

    await waitFor(() => {
      expect(screen.getByText('Neon Tokyo Cyberpunk')).toBeInTheDocument();
    });

    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(projectsApi.fetchDownloadUrl).toHaveBeenCalledWith('proj-1');
    });
  });

  it('opens duplicate modal and confirms duplicate', async () => {
    render(<VideoLibraryPage />);

    await waitFor(() => {
      const copyButtons = screen.getAllByText('Copy');
      expect(copyButtons.length).toBeGreaterThan(0);
    });

    const copyButtons = screen.getAllByText('Copy');
    fireEvent.click(copyButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText('Duplicate Video Project')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm Duplicate'));

    await waitFor(() => {
      expect(projectsApi.duplicateProject).toHaveBeenCalledWith('proj-2');
    });
  });

  it('opens delete modal and confirms deletion with permanent warning', async () => {
    render(<VideoLibraryPage />);

    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Delete');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText('Delete Video Project')).toBeInTheDocument();
    });

    expect(screen.getByText(/permanently remove the video project/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Delete Permanently'));

    await waitFor(() => {
      expect(projectsApi.deleteProject).toHaveBeenCalledWith('proj-2');
    });
  });
});
