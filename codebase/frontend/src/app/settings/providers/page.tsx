'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  createProviderConnection,
  deleteProviderConnection,
  fetchProviderConnections,
  testProviderConnection,
  updateProviderConnection,
} from '../../../lib/api/provider-connections';
import { fetchProviders } from '../../../lib/api/providers';
import {
  CreateProviderConnectionInput,
  ProviderConnection,
  UpdateProviderConnectionInput,
} from '../../../types/provider-connections';
import { Provider } from '../../../types/providers';
import { ConnectionStatusBadge } from '../../../components/providers/connection-status-badge';
import { ConnectProviderModal } from '../../../components/providers/connect-provider-modal';

function ProviderSettingsContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const connectParam = searchParams.get('connect') || undefined;

  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null,
  );

  const [isModalOpen, setIsModalOpen] = useState(Boolean(connectParam));
  const [editingConnection, setEditingConnection] =
    useState<ProviderConnection | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [connectionsList, providersList] = await Promise.all([
        fetchProviderConnections(),
        fetchProviders(),
      ]);
      setConnections(connectionsList);
      setProviders(providersList);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to load provider connections',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleTest = async (connectionId: string) => {
    try {
      setTestingId(connectionId);
      const result = await testProviderConnection(connectionId);
      setToast({
        type: result.isValid ? 'success' : 'error',
        message: result.message,
      });
      // Update local status
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connectionId
            ? { ...c, status: result.status, lastTestedAt: result.testedAt }
            : c,
        ),
      );
    } catch (err: unknown) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Test failed',
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (connectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this provider key?')) {
      return;
    }
    try {
      await deleteProviderConnection(connectionId);
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      setToast({ type: 'success', message: 'Connection removed successfully' });
    } catch (err: unknown) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete connection',
      });
    }
  };

  const handleModalSubmit = async (
    data: CreateProviderConnectionInput | UpdateProviderConnectionInput,
  ) => {
    if (editingConnection) {
      const updated = await updateProviderConnection(
        editingConnection.id,
        data as UpdateProviderConnectionInput,
      );
      setConnections((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      setToast({ type: 'success', message: 'Connection updated successfully' });
    } else {
      const created = await createProviderConnection(
        data as CreateProviderConnectionInput,
      );
      setConnections((prev) => [created, ...prev]);
      setToast({ type: 'success', message: 'Provider key connected successfully' });
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            API Providers & BYOK Keys
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Manage your AI video generator credentials. Keys are encrypted at rest with AES-256-GCM.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingConnection(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90"
        >
          + Connect Provider Key
        </button>
      </div>

      {toast && (
        <div
          className={`mt-6 rounded-lg p-3 text-xs font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'
          }`}
        >
          {toast.message}
        </div>
      )}

      {loading && (
        <div className="mt-12 text-center text-sm text-neutral-500">
          Loading your provider connections...
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && connections.length === 0 && (
        <div className="mt-12 rounded-xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-800">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            No provider keys connected yet
          </h3>
          <p className="mt-1 text-sm text-neutral-500">
            Connect your Runway, Luma, Kling, Pika or OpenAI keys to begin generating AI videos.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingConnection(null);
              setIsModalOpen(true);
            }}
            className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow"
          >
            Connect First Key
          </button>
        </div>
      )}

      {!loading && !error && connections.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <table className="min-w-full divide-y divide-neutral-200 text-left text-xs dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-300">
                  Provider & Label
                </th>
                <th className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-300">
                  Masked Key
                </th>
                <th className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-300">
                  Region
                </th>
                <th className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-300">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-300">
                  Policy
                </th>
                <th className="px-4 py-3 text-right font-medium text-neutral-700 dark:text-neutral-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {connections.map((conn) => (
                <tr key={conn.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {conn.displayName}
                    </div>
                    <div className="text-[11px] text-neutral-500 uppercase">
                      {conn.providerId}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-700 dark:text-neutral-300">
                    {conn.maskedKey}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {conn.region}
                  </td>
                  <td className="px-4 py-3">
                    <ConnectionStatusBadge status={conn.status} />
                  </td>
                  <td className="px-4 py-3">
                    {conn.blockPaidOrUnknownProviders ? (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Free-Only
                      </span>
                    ) : (
                      <span className="text-neutral-400">Standard</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={testingId === conn.id}
                        onClick={() => handleTest(conn.id)}
                        className="rounded border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        {testingId === conn.id ? 'Testing...' : 'Test Key'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingConnection(conn);
                          setIsModalOpen(true);
                        }}
                        className="rounded border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(conn.id)}
                        className="rounded border border-red-200 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConnectProviderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingConnection(null);
        }}
        providers={providers}
        initialProviderId={connectParam}
        connectionToEdit={editingConnection}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}

export default function ProviderSettingsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div className="container mx-auto p-8">Loading...</div>}>
      <ProviderSettingsContent />
    </Suspense>
  );
}
