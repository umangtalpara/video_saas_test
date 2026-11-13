import React, { useState } from 'react';
import { Provider } from '../../types/providers';
import {
  CreateProviderConnectionInput,
  ProviderConnection,
  UpdateProviderConnectionInput,
} from '../../types/provider-connections';

interface ConnectProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: Provider[];
  initialProviderId?: string;
  connectionToEdit?: ProviderConnection | null;
  onSubmit: (
    data: CreateProviderConnectionInput | UpdateProviderConnectionInput,
  ) => Promise<void>;
}

export function ConnectProviderModal({
  isOpen,
  onClose,
  providers,
  initialProviderId,
  connectionToEdit,
  onSubmit,
}: ConnectProviderModalProps): React.JSX.Element | null {
  const [providerId, setProviderId] = useState(
    connectionToEdit?.providerId || initialProviderId || providers[0]?.providerId || '',
  );
  const [displayName, setDisplayName] = useState(
    connectionToEdit?.displayName || '',
  );
  const [apiKey, setApiKey] = useState('');
  const [region, setRegion] = useState(connectionToEdit?.region || 'global');
  const [customBaseUrl, setCustomBaseUrl] = useState(
    connectionToEdit?.customBaseUrl || '',
  );
  const [dailyJobLimit, setDailyJobLimit] = useState(
    connectionToEdit?.dailyJobLimit || 50,
  );
  const [blockPaid, setBlockPaid] = useState(
    connectionToEdit?.blockPaidOrUnknownProviders || false,
  );
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!connectionToEdit && !apiKey.trim()) {
      setError('API key is required');
      return;
    }

    try {
      setLoading(true);
      if (connectionToEdit) {
        const updateData: UpdateProviderConnectionInput = {
          displayName,
          region,
          customBaseUrl,
          dailyJobLimit,
          blockPaidOrUnknownProviders: blockPaid,
        };
        if (apiKey.trim()) {
          updateData.apiKey = apiKey.trim();
        }
        await onSubmit(updateData);
      } else {
        await onSubmit({
          providerId,
          displayName: displayName || `${providerId.toUpperCase()} Key`,
          apiKey: apiKey.trim(),
          region,
          customBaseUrl,
          dailyJobLimit,
          blockPaidOrUnknownProviders: blockPaid,
        });
      }
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to save provider connection',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {connectionToEdit ? 'Edit Provider Connection' : 'Connect BYOK Provider Key'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {!connectionToEdit && (
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Provider
              </label>
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                {providers.map((p) => (
                  <option key={p.providerId} value={p.providerId}>
                    {p.displayName} ({p.company})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Connection Label
            </label>
            <input
              type="text"
              placeholder="e.g. My Primary Runway Key"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {connectionToEdit ? 'New API Key (leave empty to keep current)' : 'API Key / Secret'}
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] text-primary hover:underline"
              >
                {showKey ? 'Mask Key' : 'Reveal Key'}
              </button>
            </div>
            <input
              type={showKey ? 'text' : 'password'}
              placeholder={connectionToEdit ? connectionToEdit.maskedKey : 'sk-...'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
            <p className="mt-1 text-[11px] text-neutral-500">
              🔐 Encrypted at rest via AES-256-GCM. Never logged or exposed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Region
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Daily Job Limit
              </label>
              <input
                type="number"
                min="1"
                value={dailyJobLimit}
                onChange={(e) => setDailyJobLimit(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/40">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={blockPaid}
                onChange={(e) => setBlockPaid(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                  Strict Free-Only Protection
                </span>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Block generation jobs if provider is classified as paid or unverified to avoid unexpected billing.
                </p>
              </div>
            </label>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Saving...' : connectionToEdit ? 'Save Changes' : 'Connect & Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

