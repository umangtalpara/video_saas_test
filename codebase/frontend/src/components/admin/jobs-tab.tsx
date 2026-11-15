'use client';

import React from 'react';
import { AdminJobItem } from '../../lib/api/admin';

interface JobsTabProps {
  jobs: AdminJobItem[];
}

export function JobsTab({ jobs }: JobsTabProps): React.JSX.Element {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Global Video Jobs Monitor</h2>
          <p className="text-xs text-slate-400 mt-0.5">Track video generation pipelines and inspect detailed failure diagnostics.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="text-[11px] uppercase bg-slate-800/60 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="py-2.5 px-3">Project</th>
              <th className="py-2.5 px-3">Provider</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Diagnostics / Error</th>
              <th className="py-2.5 px-3 text-right">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {jobs.length ? jobs.map((j) => (
              <tr key={j._id} className="hover:bg-slate-800/30">
                <td className="py-3 px-3 font-medium text-white">{j.title}</td>
                <td className="py-3 px-3 uppercase text-slate-400">{j.providerId || 'mock'}</td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    j.status === 'completed'
                      ? 'bg-emerald-950 text-emerald-400'
                      : j.status === 'failed'
                      ? 'bg-red-950 text-red-400'
                      : 'bg-indigo-950 text-indigo-400'
                  }`}>
                    {j.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-xs max-w-xs truncate text-red-300 font-mono">
                  {j.errorMessage || <span className="text-slate-500 font-sans italic">None</span>}
                </td>
                <td className="py-3 px-3 text-right text-slate-500">
                  {new Date(j.createdAt).toLocaleDateString()}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">No generation jobs found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

