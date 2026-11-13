import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProviderSettingsPage from './page';
import * as connectionsApi from '../../../lib/api/provider-connections';
import * as providersApi from '../../../lib/api/providers';
import { ProviderConnection } from '../../../types/provider-connections';
import { Provider } from '../../../types/providers';

jest.mock('../../../lib/api/provider-connections');
jest.mock('../../../lib/api/providers');
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
}));

describe('ProviderSettingsPage', () => {
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
  ];

  const mockConnections: ProviderConnection[] = [
    {
      id: 'conn-1',
      providerId: 'runway',
      displayName: 'Production Runway Key',
      maskedKey: 'sk-****cdef',
      region: 'global',
      status: 'valid',
      dailyJobLimit: 50,
      monthlyJobLimit: 500,
      maxCostPerProject: 0,
      blockPaidOrUnknownProviders: true,
      isEnabled: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (providersApi.fetchProviders as jest.Mock).mockResolvedValue(mockProviders);
    (connectionsApi.fetchProviderConnections as jest.Mock).mockResolvedValue(
      mockConnections,
    );
    (connectionsApi.testProviderConnection as jest.Mock).mockResolvedValue({
      connectionId: 'conn-1',
      providerId: 'runway',
      status: 'valid',
      isValid: true,
      message: 'Key is active and verified',
      latencyMs: 40,
      testedAt: new Date().toISOString(),
    });
  });

  it('renders connections table with masked key and status', async () => {
    render(<ProviderSettingsPage />);

    expect(
      screen.getByText(/Manage your AI video generator credentials/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Production Runway Key')).toBeInTheDocument();
      expect(screen.getByText('sk-****cdef')).toBeInTheDocument();
      expect(screen.getByText('Active / Valid')).toBeInTheDocument();
      expect(screen.getByText('Free-Only')).toBeInTheDocument();
    });
  });

  it('handles testing connection and shows toast', async () => {
    render(<ProviderSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Key')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Key'));

    await waitFor(() => {
      expect(connectionsApi.testProviderConnection).toHaveBeenCalledWith('conn-1');
      expect(
        screen.getByText('Key is active and verified'),
      ).toBeInTheDocument();
    });
  });
});
