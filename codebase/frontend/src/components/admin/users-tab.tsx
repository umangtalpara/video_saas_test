'use client';

import React from 'react';
import { AdminUserItem } from '../../lib/api/admin';

interface UsersTabProps {
  users: AdminUserItem[];
  onToggleStatus: (userId: string, currentStatus: string) => Promise<void>;
  loadingAction: string | null;
}

export function UsersTab({
  users,
  onToggleStatus,
  loadingAction,
}: UsersTabProps): React.JSX.Element {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">User Accounts & Access Control</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage user access and immediately suspend abusive or compromised accounts.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="text-[11px] uppercase bg-slate-800/60 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="py-2.5 px-3">User</th>
              <th className="py-2.5 px-3">Email</th>
              <th className="py-2.5 px-3">Role</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-slate-800/30">
                <td className="py-3 px-3 font-medium text-white">{u.name}</td>
                <td className="py-3 px-3 text-slate-400">{u.email}</td>
                <td className="py-3 px-3 uppercase text-[11px] font-semibold text-indigo-400">{u.role}</td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    u.status === 'active' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                  }`}>
                    {u.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    type="button"
                    disabled={loadingAction === u._id}
                    onClick={() => onToggleStatus(u._id, u.status)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${
                      u.status === 'active'
                        ? 'bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800'
                        : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {loadingAction === u._id ? 'Updating...' : u.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
