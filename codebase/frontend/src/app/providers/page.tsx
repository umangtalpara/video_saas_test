'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { fetchProviders, fetchProviderModels } from '../../lib/api/providers';
import { Provider, ProviderModel } from '../../types/providers';
import { ProviderCard } from '../../components/providers/provider-card';

export default function ProvidersPage(): React.JSX.Element {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [modelsByProvider, setModelsByProvider] = useState<
    Record<string, ProviderModel[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [billingFilter, setBillingFilter] = useState<string>('all');

  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      try {
        setLoading(true);
        setError(null);
        const providerList = await fetchProviders();
        if (!isMounted) return;
        setProviders(providerList);

        // Fetch models in parallel for each provider
        const modelsMap: Record<string, ProviderModel[]> = {};
        await Promise.all(
          providerList.map(async (p) => {
            try {
              const models = await fetchProviderModels(p.providerId);
              modelsMap[p.providerId] = models;
            } catch {
              modelsMap[p.providerId] = [];
            }
          }),
        );

        if (isMounted) {
          setModelsByProvider(modelsMap);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : 'Failed to load provider catalog';
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      const matchesSearch =
        p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (modelsByProvider[p.providerId] || []).some((m) =>
          m.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      const matchesBilling =
        billingFilter === 'all' || p.billingClassification === billingFilter;

      return matchesSearch && matchesBilling;
    });
  }, [providers, modelsByProvider, searchQuery, billingFilter]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Provider Catalog
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Explore AI video generation engines, supported aspect ratios, model limits, and billing tiers.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by provider or model name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm shadow-sm transition placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />

        <select
          value={billingFilter}
          onChange={(e) => setBillingFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <option value="all">All Billing Tiers</option>
          <option value="user_managed">BYOK User-Managed</option>
          <option value="free_verified">Free Verified</option>
          <option value="trial">Trial Quota</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {loading && (
        <div className="mt-12 text-center text-sm text-neutral-500">
          Loading provider models and capabilities...
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && filteredProviders.length === 0 && (
        <div className="mt-12 text-center">
          <p className="text-base font-medium text-neutral-800 dark:text-neutral-200">
            No providers found
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Try adjusting your search query or billing filters.
          </p>
        </div>
      )}

      {!loading && !error && filteredProviders.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProviders.map((provider) => (
            <ProviderCard
              key={provider.providerId}
              provider={provider}
              models={modelsByProvider[provider.providerId]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

