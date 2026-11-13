import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ProvidersPage from './page';
import * as providersApi from '../../lib/api/providers';
import { Provider, ProviderModel } from '../../types/providers';

jest.mock('../../lib/api/providers');

describe('ProvidersPage', () => {
  const mockProviders: Provider[] = [
    {
      providerId: 'runway',
      displayName: 'Runway',
      company: 'Runway AI',
      country: 'United States',
      providerType: 'direct',
      documentationUrl: 'https://docs.runwayml.com',
      apiBaseUrl: 'https://api.runwayml.com',
      authType: 'bearer',
      authHeaderName: 'Authorization',
      capabilities: ['text_to_video'],
      billingClassification: 'user_managed',
      freeQuotaPolicy: {},
      isEnabled: true,
      isMaintenance: false,
      termsNotes: '',
      regionRestrictions: [],
    },
    {
      providerId: 'sora',
      displayName: 'OpenAI Sora',
      company: 'OpenAI',
      country: 'United States',
      providerType: 'direct',
      documentationUrl: 'https://openai.com',
      apiBaseUrl: 'https://api.openai.com',
      authType: 'bearer',
      authHeaderName: 'Authorization',
      capabilities: ['text_to_video'],
      billingClassification: 'paid',
      freeQuotaPolicy: {},
      isEnabled: true,
      isMaintenance: false,
      termsNotes: '',
      regionRestrictions: [],
    },
  ];

  const mockModels: ProviderModel[] = [
    {
      providerId: 'runway',
      modelId: 'gen-3-alpha-turbo',
      displayName: 'Gen-3 Alpha Turbo',
      description: 'Fast turbo generation',
      capabilities: ['text_to_video'],
      supportedAspectRatios: ['16:9', '9:16'],
      supportedResolutions: ['720p', '1080p'],
      minDurationSeconds: 5,
      maxDurationSeconds: 10,
      isAsync: true,
      estimatedCostPerSecond: 0.05,
      freeQuotaEligible: false,
      isEnabled: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (providersApi.fetchProviders as jest.Mock).mockResolvedValue(mockProviders);
    (providersApi.fetchProviderModels as jest.Mock).mockImplementation(
      (providerId: string) => {
        if (providerId === 'runway') {
          return Promise.resolve(mockModels);
        }
        return Promise.resolve([]);
      },
    );
  });

  it('renders provider catalog title and cards', async () => {
    render(<ProvidersPage />);

    expect(
      screen.getByText(/Explore AI video generation engines/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Runway')).toBeInTheDocument();
      expect(screen.getByText('OpenAI Sora')).toBeInTheDocument();
    });
  });

  it('displays billing badges for providers', async () => {
    render(<ProvidersPage />);

    await waitFor(() => {
      expect(screen.getAllByText('BYOK User-Managed').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Paid / Pay-as-you-go')).toBeInTheDocument();
    });
  });
});
