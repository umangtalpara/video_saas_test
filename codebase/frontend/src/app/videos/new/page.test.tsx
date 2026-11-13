import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VideoCreationWizardPage from './page';
import * as projectsApi from '../../../lib/api/projects';
import * as providersApi from '../../../lib/api/providers';
import * as connectionsApi from '../../../lib/api/provider-connections';

jest.mock('../../../lib/api/projects');
jest.mock('../../../lib/api/providers');
jest.mock('../../../lib/api/provider-connections');
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('VideoCreationWizardPage', () => {
  const mockProviders = [
    {
      providerId: 'runway',
      displayName: 'Runway',
      billingClassification: 'user_managed',
    },
  ];

  const mockModels = [
    {
      providerId: 'runway',
      modelId: 'gen-3-alpha-turbo',
      displayName: 'Gen-3 Alpha Turbo',
      minDurationSeconds: 5,
      maxDurationSeconds: 10,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (providersApi.fetchProviders as jest.Mock).mockResolvedValue(mockProviders);
    (providersApi.fetchProviderModels as jest.Mock).mockResolvedValue(mockModels);
    (connectionsApi.fetchProviderConnections as jest.Mock).mockResolvedValue([]);
  });

  it('renders step 1 with prompt and style selection', async () => {
    render(<VideoCreationWizardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Create New AI Video/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/Describe your story or video in detail/i),
      ).toBeInTheDocument();
      expect(screen.getByText('Cinematic')).toBeInTheDocument();
    });
  });

  it('advances through wizard steps and submits project', async () => {
    (projectsApi.createProject as jest.Mock).mockResolvedValue({
      id: 'proj-123',
      title: 'Deep Ocean',
    });
    (projectsApi.generateProjectScript as jest.Mock).mockResolvedValue({
      id: 'proj-123',
      status: 'awaiting_approval',
    });

    render(<VideoCreationWizardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Create New AI Video/i)).toBeInTheDocument();
    });

    // Step 1: fill prompt and continue
    const promptInput = screen.getByPlaceholderText(
      /Describe your story or video in detail/i,
    );
    fireEvent.change(promptInput, {
      target: { value: 'Exploring hydrothermal vents in the Mariana Trench' },
    });
    fireEvent.click(screen.getByText('Continue →'));

    // Step 2: format & duration
    await waitFor(() => {
      expect(screen.getByText('Target Duration')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue →'));

    // Step 3: engine & key
    await waitFor(() => {
      expect(screen.getByText('Video Generation Provider')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue →'));

    // Step 4: summary and submit
    await waitFor(() => {
      expect(screen.getByText('Configuration Summary')).toBeInTheDocument();
    });

    const generateBtn = screen.getByRole('button', {
      name: /Generate Video Script/i,
    });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(projectsApi.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Exploring hydrothermal vents in the Mariana Trench',
        }),
      );
      expect(projectsApi.generateProjectScript).toHaveBeenCalledWith('proj-123');
      expect(mockPush).toHaveBeenCalledWith('/videos/proj-123/edit-script');
    });
  });
});

