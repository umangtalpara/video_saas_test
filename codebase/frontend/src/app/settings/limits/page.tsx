'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchUserLimits, updateUserLimits, UserLimits } from '../../../lib/api/usage';

export default function LimitsSettingsPage(): React.JSX.Element {
  const [limits, setLimits] = useState<UserLimits>({
    dailyJobCap: 25,
    monthlyJobCap: 250,
    maxCostPerProjectUsd: 10.0,
    blockPaidProviders: true,
    allowedProviders: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await fetchUserLimits();
        if (isMounted) setLimits(data);
      } catch {
        // Fallback to default state
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      await updateUserLimits(limits);
      setMessage({ type: 'success', text: 'Safety limits updated successfully.' });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update limits' });
    } finally {
      setSaving(false);
    }
  };

  const toggleProvider = (id: string) => {
    const current = limits.allowedProviders || [];
    const next = current.includes(id) ? current.filter((p) => p !== id) : [...current, id];
    setLimits({ ...limits, allowedProviders: next });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12 text-center text-slate-400">
        <p className="animate-pulse">Loading limit settings...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Generation Limits & Safety</h1>
          <p className="text-sm text-slate-400 mt-1">Configure automated consumption caps and paid-provider protection.</p>
        </div>
        <Link href="/usage" className="text-sm text-indigo-400 hover:text-indigo-300 transition">
          ← Back to Usage
        </Link>
      </div>

      {message && (
        <div className={`p-4 mb-6 rounded-lg text-sm border ${message.type === 'success' ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-red-950/40 border-red-800 text-red-300'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dailyCap" className="block text-xs font-semibold text-slate-300 uppercase mb-2">Daily Job Cap</label>
            <input
              id="dailyCap"
              type="number"
              min={1}
              max={1000}
              value={limits.dailyJobCap}
              onChange={(e) => setLimits({ ...limits, dailyJobCap: parseInt(e.target.value, 10) || 1 })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">Maximum videos you can queue per day</span>
          </div>

          <div>
            <label htmlFor="monthlyCap" className="block text-xs font-semibold text-slate-300 uppercase mb-2">Monthly Job Cap</label>
            <input
              id="monthlyCap"
              type="number"
              min={1}
              max={10000}
              value={limits.monthlyJobCap}
              onChange={(e) => setLimits({ ...limits, monthlyJobCap: parseInt(e.target.value, 10) || 1 })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">Maximum videos you can queue per month</span>
          </div>
        </div>

        <div>
          <label htmlFor="maxCost" className="block text-xs font-semibold text-slate-300 uppercase mb-2">Max Cost Per Project ($ USD)</label>
          <input
            id="maxCost"
            type="number"
            step="0.5"
            min={0}
            max={100}
            value={limits.maxCostPerProjectUsd}
            onChange={(e) => setLimits({ ...limits, maxCostPerProjectUsd: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
            required
          />
          <span className="text-[11px] text-slate-500 mt-1 block">Prevent queuing projects exceeding this estimated BYOK token cost</span>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Strict Free-Only Protection</p>
              <p className="text-xs text-slate-400">Block any provider or model that incurs third-party API billing.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={limits.blockPaidProviders}
                onChange={(e) => setLimits({ ...limits, blockPaidProviders: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <p className="text-xs font-semibold text-slate-300 uppercase mb-2">Provider Whitelist (Optional)</p>
          <p className="text-xs text-slate-500 mb-3">If selected, only the chosen providers will be allowed for generation.</p>
          <div className="flex flex-wrap gap-2">
            {['mock', 'wan', 'runway'].map((pid) => {
              const active = limits.allowedProviders?.includes(pid);
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => toggleProvider(pid)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition uppercase ${active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {active ? `✓ ${pid}` : `+ ${pid}`}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition shadow-sm"
          >
            {saving ? 'Saving...' : 'Save Limit Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

