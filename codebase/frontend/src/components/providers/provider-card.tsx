import React, { useState } from 'react';
import Link from 'next/link';
import { Provider, ProviderModel } from '../../types/providers';
import { BillingBadge } from './billing-badge';

interface ProviderCardProps {
  provider: Provider;
  models?: ProviderModel[];
}

export function ProviderCard({
  provider,
  models = [],
}: ProviderCardProps): React.JSX.Element {
  const [showModels, setShowModels] = useState(false);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {provider.displayName}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {provider.company} • {provider.country}
          </p>
        </div>
        <BillingBadge classification={provider.billingClassification} />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {provider.capabilities.map((cap) => (
          <span
            key={cap}
            className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          >
            {cap.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {provider.termsNotes && (
        <p className="mt-3 text-xs italic text-neutral-500 dark:text-neutral-400">
          {provider.termsNotes}
        </p>
      )}

      {models.length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setShowModels(!showModels)}
            className="flex w-full items-center justify-between text-xs font-medium text-primary hover:underline"
          >
            <span>
              {models.length} model{models.length > 1 ? 's' : ''} available
            </span>
            <span>{showModels ? 'Hide ▲' : 'Show ▼'}</span>
          </button>

          {showModels && (
            <div className="mt-3 space-y-2">
              {models.map((model) => (
                <div
                  key={model.modelId}
                  className="rounded-lg bg-neutral-50 p-2.5 text-xs dark:bg-neutral-800/60"
                >
                  <div className="flex items-center justify-between font-medium text-neutral-800 dark:text-neutral-200">
                    <span>{model.displayName}</span>
                    <span className="text-[11px] text-neutral-500">
                      {model.minDurationSeconds}s – {model.maxDurationSeconds}s
                    </span>
                  </div>
                  {model.description && (
                    <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                      {model.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded bg-neutral-200/70 px-1.5 py-0.5 text-[10px] dark:bg-neutral-700">
                      Ratios: {model.supportedAspectRatios.join(', ')}
                    </span>
                    <span className="rounded bg-neutral-200/70 px-1.5 py-0.5 text-[10px] dark:bg-neutral-700">
                      Res: {model.supportedResolutions.join(', ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <a
          href={provider.documentationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
        >
          Docs ↗
        </a>
        <Link
          href={`/settings/providers?connect=${provider.providerId}`}
          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow transition hover:opacity-90"
        >
          Connect Key
        </Link>
      </div>
    </div>
  );
}
