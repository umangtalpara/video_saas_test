import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import UsagePage from './page';
import * as usageApi from '../../lib/api/usage';

jest.mock('../../lib/api/usage');

describe('UsagePage', () => {
  const mockSummary: usageApi.UsageSummary = {
    jobsToday: 5,
    jobsThisMonth: 22,
    dailyLimit: 25,
    monthlyLimit: 250,
    totalCostUsd: 2.5,
    blockPaidProviders: true,
    providerBreakdown: [
      { providerId: 'wan', totalUnits: 25, totalCost: 2.5, callCount: 5 },
    ],
  };

  const mockLogs: usageApi.ProviderUsageLog[] = [
    {
      _id: 'log-1',
      providerId: 'wan',
      modelId: 'wan-2.1',
      operation: 'video_generation',
      status: 'success',
      unitsConsumed: 5,
      durationSeconds: 5,
      costEstimatedUsd: 0.5,
      isPaid: false,
      createdAt: '2026-11-15T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (usageApi.fetchUsageSummary as jest.Mock).mockResolvedValue(mockSummary);
    (usageApi.fetchUsageLogs as jest.Mock).mockResolvedValue(mockLogs);
  });

  it('renders usage analytics dashboard cards', async () => {
    render(<UsagePage />);

    expect(screen.getByText(/Loading usage analytics/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Usage & Consumption/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Daily Generation Cap/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly Generation Cap/i)).toBeInTheDocument();
    expect(screen.getByText(/Estimated Total Cost/i)).toBeInTheDocument();
    expect(screen.getByText(/Strict Free-Only Active/i)).toBeInTheDocument();
  });

  it('renders provider breakdown and call logs', async () => {
    render(<UsagePage />);

    await waitFor(() => {
      expect(screen.getByText(/Consumption by Provider/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Recent Provider Calls/i)).toBeInTheDocument();
    expect(screen.getAllByText(/WAN/i).length).toBeGreaterThan(0);
    expect(screen.getByText('video_generation')).toBeInTheDocument();
  });
});
