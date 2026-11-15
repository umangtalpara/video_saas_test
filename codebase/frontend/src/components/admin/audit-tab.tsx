'use client';

import React from 'react';
import { AdminAuditLogItem } from '../../lib/api/admin';

interface AuditTabProps {
  logs: AdminAuditLogItem[];
}

export function AuditTab({ logs }: AuditTabProps): React.JSX.Element {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">System Security Audit Trail</h2>
          <p className="text-xs text-slate-400 mt-0.5">Immutable record of administrative actions, status toggles, and emergency overrides.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="text-[11px] uppercase bg-slate-800/60 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Admin</th>
              <th className="py-2.5 px-3">Action</th>
              <th className="py-2.5 px-3">Target</th>
              <th className="py-2.5 px-3">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {logs.length ? logs.map((l) => (
              <tr key={l._id} className="hover:bg-slate-800/30">
                <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                  {new Date(l.createdAt).toLocaleString()}
                </td>
                <td className="py-3 px-3 font-medium text-white">{l.adminEmail}</td>
                <td className="py-3 px-3 font-semibold text-indigo-400">{l.action}</td>
                <td className="py-3 px-3 text-slate-300">{l.targetType}: {l.targetId}</td>
                <td className="py-3 px-3 text-slate-500 font-mono">{l.ipAddress}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">No audit events logged yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

