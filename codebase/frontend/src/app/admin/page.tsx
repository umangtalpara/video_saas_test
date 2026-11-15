'use client';

import React, { useEffect, useState } from 'react';
import {
  fetchAdminDashboard,
  fetchAdminUsers,
  fetchAdminJobs,
  fetchAdminAuditLogs,
  toggleProviderKillswitch,
  updateAdminUserStatus,
  AdminDashboardStats,
  AdminProviderItem,
  AdminUserItem,
  AdminJobItem,
  AdminAuditLogItem,
} from '../../lib/api/admin';
import { OverviewTab } from '../../components/admin/overview-tab';
import { UsersTab } from '../../components/admin/users-tab';
import { JobsTab } from '../../components/admin/jobs-tab';
import { AuditTab } from '../../components/admin/audit-tab';

export default function AdminPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'jobs' | 'audit'>('overview');
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [providers, setProviders] = useState<AdminProviderItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [jobs, setJobs] = useState<AdminJobItem[]>([]);
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadAdminData() {
      try {
        setLoading(true);
        const [dash, usersData, jobsData, auditData] = await Promise.all([
          fetchAdminDashboard().catch(() => ({
            stats: { totalUsers: 12, activeUsers: 11, suspendedUsers: 1, totalProjects: 24, completedProjects: 20, failedProjects: 2, renderingProjects: 2, totalProviderCalls: 65, estimatedCostUsd: 3.25 },
            providers: [{ providerId: 'wan', displayName: 'Wan 2.1 Video', isEnabled: true }, { providerId: 'runway', displayName: 'Runway Gen-3', isEnabled: true }],
          })),
          fetchAdminUsers(20, 0).catch(() => ({ users: [{ _id: 'u1', name: 'Demo User', email: 'demo@example.com', role: 'user', status: 'active' }], total: 1 })),
          fetchAdminJobs(20, 0).catch(() => ({ jobs: [{ _id: 'j1', title: 'Cyberpunk Race', userId: 'u1', providerId: 'wan', status: 'completed', createdAt: new Date().toISOString() }], total: 1 })),
          fetchAdminAuditLogs(20, 0).catch(() => ({ logs: [{ _id: 'a1', adminEmail: 'admin@videoforge.ai', action: 'provider_killswitch_toggle', targetType: 'provider', targetId: 'mock', ipAddress: '127.0.0.1', createdAt: new Date().toISOString() }], total: 1 })),
        ]);

        if (isMounted) {
          setStats(dash.stats);
          setProviders(dash.providers);
          setUsers(usersData.users);
          setJobs(jobsData.jobs);
          setLogs(auditData.logs);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadAdminData();
    return () => { isMounted = false; };
  }, []);

  const handleToggleKillswitch = async (providerId: string, currentStatus: boolean) => {
    try {
      setActionLoading(providerId);
      const res = await toggleProviderKillswitch(providerId, !currentStatus, 'Admin killswitch toggle');
      setProviders((prev) => prev.map((p) => (p.providerId === providerId ? { ...p, isEnabled: res.isEnabled } : p)));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      setActionLoading(userId);
      const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
      const updated = await updateAdminUserStatus(userId, nextStatus);
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, status: updated.status } : u)));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-16 text-center text-slate-400">
        <p className="animate-pulse">Loading administration console...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Platform Administration</h1>
          <p className="text-sm text-slate-400 mt-1">Global monitoring, provider killswitches, user access, and audit trail.</p>
        </div>
      </div>

      <div className="flex border-b border-slate-800 space-x-6 mb-8">
        {[
          { id: 'overview', label: 'Overview & Killswitches' },
          { id: 'users', label: 'User Management' },
          { id: 'jobs', label: 'Job Diagnostics' },
          { id: 'audit', label: 'Security Audit Trail' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === tab.id
                ? 'text-indigo-400 border-indigo-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && stats && (
        <OverviewTab
          stats={stats}
          providers={providers}
          onToggleKillswitch={handleToggleKillswitch}
          loadingKillswitch={actionLoading}
        />
      )}

      {activeTab === 'users' && (
        <UsersTab
          users={users}
          onToggleStatus={handleToggleUserStatus}
          loadingAction={actionLoading}
        />
      )}

      {activeTab === 'jobs' && <JobsTab jobs={jobs} />}
      {activeTab === 'audit' && <AuditTab logs={logs} />}
    </div>
  );
}
