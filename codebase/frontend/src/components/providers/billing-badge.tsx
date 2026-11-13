import React from 'react';
import { BillingClassification } from '../../types/providers';

interface BillingBadgeProps {
  classification: BillingClassification;
}

export function BillingBadge({ classification }: BillingBadgeProps): React.JSX.Element {
  switch (classification) {
    case 'free_verified':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          Free Verified
        </span>
      );
    case 'trial':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
          Trial Quota
        </span>
      );
    case 'paid':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          Paid / Pay-as-you-go
        </span>
      );
    case 'user_managed':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
          BYOK User-Managed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">
          Unknown Billing
        </span>
      );
  }
}

