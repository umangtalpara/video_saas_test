import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LimitsSettingsPage from './page';
import * as usageApi from '../../../lib/api/usage';

jest.mock('../../../lib/api/usage');

describe('LimitsSettingsPage', () => {
  const mockLimits: usageApi.UserLimits = {
    dailyJobCap: 30,
    monthlyJobCap: 300,
    maxCostPerProjectUsd: 15.0,
    blockPaidProviders: true,
    allowedProviders: ['wan', 'mock'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usageApi.fetchUserLimits as jest.Mock).mockResolvedValue(mockLimits);
    (usageApi.updateUserLimits as jest.Mock).mockResolvedValue(mockLimits);
  });

  it('renders limit settings form with preloaded values', async () => {
    render(<LimitsSettingsPage />);

    expect(screen.getByText(/Loading limit settings/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Generation Limits & Safety/i })).toBeInTheDocument();
    });

    const dailyInput = screen.getByLabelText(/Daily Job Cap/i) as HTMLInputElement;
    expect(dailyInput.value).toBe('30');

    const monthlyInput = screen.getByLabelText(/Monthly Job Cap/i) as HTMLInputElement;
    expect(monthlyInput.value).toBe('300');

    const maxCostInput = screen.getByLabelText(/Max Cost Per Project/i) as HTMLInputElement;
    expect(maxCostInput.value).toBe('15');
  });

  it('updates limits when submitted', async () => {
    render(<LimitsSettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Generation Limits & Safety/i })).toBeInTheDocument();
    });

    const dailyInput = screen.getByLabelText(/Daily Job Cap/i);
    fireEvent.change(dailyInput, { target: { value: '45' } });

    const submitBtn = screen.getByRole('button', { name: /Save Limit Settings/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(usageApi.updateUserLimits).toHaveBeenCalledWith(
        expect.objectContaining({
          dailyJobCap: 45,
        }),
      );
      expect(screen.getByText(/Safety limits updated successfully/i)).toBeInTheDocument();
    });
  });
});

