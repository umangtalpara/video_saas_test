import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPage from './page';
import * as adminApi from '../../lib/api/admin';

jest.mock('../../lib/api/admin');

describe('AdminPage', () => {
  const mockDashboard = {
    stats: {
      totalUsers: 15,
      activeUsers: 14,
      suspendedUsers: 1,
      totalProjects: 30,
      completedProjects: 26,
      failedProjects: 2,
      renderingProjects: 2,
      totalProviderCalls: 90,
      estimatedCostUsd: 4.5,
    },
    providers: [
      { providerId: 'wan', displayName: 'Wan 2.1 Video', isEnabled: true },
    ],
  };

  const mockUsers = {
    users: [
      { _id: 'u1', name: 'John Doe', email: 'john@example.com', role: 'user', status: 'active' },
    ],
    total: 1,
  };

  const mockJobs = {
    jobs: [
      { _id: 'j1', title: 'Cyberpunk Race', userId: 'u1', providerId: 'wan', status: 'failed', errorMessage: 'Timeout', createdAt: '2026-11-15T10:00:00Z' },
    ],
    total: 1,
  };

  const mockAudit = {
    logs: [
      { _id: 'a1', adminEmail: 'admin@videoforge.ai', action: 'user_suspension_toggle', targetType: 'user', targetId: 'u1', ipAddress: '127.0.0.1', createdAt: '2026-11-15T10:00:00Z' },
    ],
    total: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (adminApi.fetchAdminDashboard as jest.Mock).mockResolvedValue(mockDashboard);
    (adminApi.fetchAdminUsers as jest.Mock).mockResolvedValue(mockUsers);
    (adminApi.fetchAdminJobs as jest.Mock).mockResolvedValue(mockJobs);
    (adminApi.fetchAdminAuditLogs as jest.Mock).mockResolvedValue(mockAudit);
    (adminApi.toggleProviderKillswitch as jest.Mock).mockResolvedValue({ providerId: 'wan', isEnabled: false });
    (adminApi.updateAdminUserStatus as jest.Mock).mockResolvedValue({ _id: 'u1', status: 'suspended' });
  });

  it('renders dashboard KPIs and handles provider killswitch', async () => {
    render(<AdminPage />);

    expect(screen.getByText(/Loading administration console/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Platform Administration/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Wan 2.1 Video')).toBeInTheDocument();

    const killBtn = screen.getByRole('button', { name: /⚡ Emergency Killswitch/i });
    fireEvent.click(killBtn);

    await waitFor(() => {
      expect(adminApi.toggleProviderKillswitch).toHaveBeenCalledWith('wan', false, expect.any(String));
    });
  });

  it('allows switching tabs to User Management, Job Diagnostics, and Audit Trail', async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Platform Administration/i })).toBeInTheDocument();
    });

    // Switch to User Management
    fireEvent.click(screen.getByRole('button', { name: /User Management/i }));
    expect(screen.getByRole('heading', { name: /User Accounts & Access Control/i })).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();

    // Toggle user suspension
    const suspendBtn = screen.getByRole('button', { name: /Suspend/i });
    fireEvent.click(suspendBtn);

    await waitFor(() => {
      expect(adminApi.updateAdminUserStatus).toHaveBeenCalledWith('u1', 'suspended');
    });

    // Switch to Job Diagnostics
    fireEvent.click(screen.getByRole('button', { name: /Job Diagnostics/i }));
    expect(screen.getByRole('heading', { name: /Global Video Jobs Monitor/i })).toBeInTheDocument();
    expect(screen.getByText('Cyberpunk Race')).toBeInTheDocument();
    expect(screen.getByText('Timeout')).toBeInTheDocument();

    // Switch to Security Audit Trail
    fireEvent.click(screen.getByRole('button', { name: /Security Audit Trail/i }));
    expect(screen.getByRole('heading', { name: /System Security Audit Trail/i })).toBeInTheDocument();
    expect(screen.getByText('admin@videoforge.ai')).toBeInTheDocument();
  });
});
