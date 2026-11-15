'use client';

import React from 'react';
import { AdminDashboardStats, AdminProviderItem } from '../../lib/api/admin';

interface OverviewTabProps {
  stats: AdminDashboardStats;
  providers: AdminProviderItem[];
  onToggleKillswitch: (providerId: string, currentStatus: boolean) => Promise<void>;
  loadingKillswitch: string | null;
}

export function OverviewTab({
  stats,
  providers,
  onToggleKillswitch,
  loadingKillswitch,
}: OverviewTabProps): React.JSX.Element {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-xs uppercase text-slate-400 font-medium">Total Users</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.totalUsers}</p>
          <p className="text-xs text-slate-500 mt-1">{stats.activeUsers} active · {stats.suspendedUsers} suspended</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-xs uppercase text-slate-400 font-medium">Total Videos</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.totalProjects}</p>
          <p className="text-xs text-slate-500 mt-1">{stats.completedProjects} completed · {stats.failedProjects} failed</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-xs uppercase text-slate-400 font-medium">Provider API Calls</p>
          <p className="text-2xl font-bold text-indigo-400 mt-1">{stats.totalProviderCalls}</p>
          <p className="text-xs text-slate-500 mt-1">Aggregated generation jobs</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-xs uppercase text-slate-400 font-medium">Est. System Cost</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">${stats.estimatedCostUsd.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">USD token expenditure</p>
        </div>
      </div>

      <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Provider Catalogue & Emergency Killswitch</h2>
            <p className="text-xs text-slate-400 mt-0.5">Globally enable or kill video generation providers to mitigate rate limits or spikes.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {providers.map((p) => (
            <div key={p.providerId} className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white text-sm">{p.displayName}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${p.isEnabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
                    {p.isEnabled ? 'ONLINE' : 'KILLED'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-4">ID: {p.providerId}</p>
              </div>

              <button
                type="button"
                disabled={loadingKillswitch === p.providerId}
                onClick={() => onToggleKillswitch(p.providerId, p.isEnabled)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  p.isEnabled
                    ? 'bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-700'
                    : 'bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                }`}
              >
                {loadingKillswitch === p.providerId ? 'Processing...' : p.isEnabled ? '⚡ Emergency Killswitch' : '✓ Re-enable Provider'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
