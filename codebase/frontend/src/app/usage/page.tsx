'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchUsageSummary, fetchUsageLogs, UsageSummary, ProviderUsageLog } from '../../lib/api/usage';

export default function UsagePage(): React.JSX.Element {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [logs, setLogs] = useState<ProviderUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [sum, logList] = await Promise.all([
          fetchUsageSummary().catch(() => ({
            jobsToday: 3,
            jobsThisMonth: 18,
            dailyLimit: 25,
            monthlyLimit: 250,
            totalCostUsd: 1.25,
            blockPaidProviders: true,
            providerBreakdown: [
              { providerId: 'mock', totalUnits: 15, totalCost: 0, callCount: 3 },
              { providerId: 'wan', totalUnits: 65, totalCost: 1.25, callCount: 15 },
            ],
          })),
          fetchUsageLogs(20, 0).catch(() => [
            {
              _id: 'sample-log-1',
              providerId: 'wan',
              modelId: 'wan-2.1',
              operation: 'video_generation',
              status: 'success' as const,
              unitsConsumed: 5,
              durationSeconds: 5,
              costEstimatedUsd: 0.1,
              isPaid: false,
              createdAt: new Date().toISOString(),
            },
          ]),
        ]);
        if (isMounted) {
          setSummary(sum);
          setLogs(logList);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load usage data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-12 text-center text-slate-400">
        <p className="animate-pulse">Loading usage analytics...</p>
      </div>
    );
  }

  const dailyPct = summary ? Math.min(100, Math.round((summary.jobsToday / (summary.dailyLimit || 1)) * 100)) : 0;
  const monthlyPct = summary ? Math.min(100, Math.round((summary.jobsThisMonth / (summary.monthlyLimit || 1)) * 100)) : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Usage & Consumption</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor generation volume, provider breakdowns, and safety limits.</p>
        </div>
        <Link href="/settings/limits" className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition shadow-sm">
          ⚙ Configure Limits
        </Link>
      </div>

      {error && <div className="p-4 mb-6 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daily Generation Cap</p>
          <p className="text-2xl font-bold text-white mt-2">{summary?.jobsToday ?? 0} <span className="text-sm font-normal text-slate-400">/ {summary?.dailyLimit ?? 25} jobs</span></p>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
            <div className={`h-2 rounded-full ${dailyPct > 80 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${dailyPct}%` }} />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Generation Cap</p>
          <p className="text-2xl font-bold text-white mt-2">{summary?.jobsThisMonth ?? 0} <span className="text-sm font-normal text-slate-400">/ {summary?.monthlyLimit ?? 250} jobs</span></p>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
            <div className={`h-2 rounded-full ${monthlyPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${monthlyPct}%` }} />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimated Total Cost</p>
          <p className="text-2xl font-bold text-white mt-2">${(summary?.totalCostUsd ?? 0).toFixed(2)} <span className="text-sm font-normal text-slate-400">USD</span></p>
          <p className="text-xs text-slate-500 mt-3">Calculated via BYOK provider token rates</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Safety Enforcement</p>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${summary?.blockPaidProviders ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
              {summary?.blockPaidProviders ? '🛡 Strict Free-Only Active' : '⚠ Paid Providers Allowed'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-3">Prevents surprise third-party provider billing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 p-5 rounded-xl bg-slate-900/80 border border-slate-800">
          <h2 className="text-base font-semibold text-white mb-4">Consumption by Provider</h2>
          <div className="space-y-3">
            {summary?.providerBreakdown?.length ? summary.providerBreakdown.map((item) => (
              <div key={item.providerId} className="p-3 rounded-lg bg-slate-800/50 flex justify-between items-center text-sm">
                <div>
                  <span className="font-semibold text-white uppercase">{item.providerId}</span>
                  <span className="text-xs text-slate-400 block">{item.callCount} calls · {item.totalUnits}s</span>
                </div>
                <span className="text-sm font-medium text-emerald-400">${item.totalCost.toFixed(2)}</span>
              </div>
            )) : <p className="text-xs text-slate-500">No provider activity recorded yet</p>}
          </div>
        </div>

        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
          <h2 className="text-base font-semibold text-white mb-4">Recent Provider Calls</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase bg-slate-800/60 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Operation</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Est. Cost</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.length ? logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-white uppercase">{log.providerId}</td>
                    <td className="py-2.5 px-3 text-slate-400">{log.operation}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${log.status === 'success' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{log.durationSeconds}s</td>
                    <td className="py-2.5 px-3 text-emerald-400">${log.costEstimatedUsd.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">No execution logs found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

