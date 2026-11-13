'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { AuthLayout } from '../../components/layout/auth-layout';
import { Button } from '../../components/ui/button';
import { apiClient } from '../../lib/api-client';

function VerifyEmailContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = React.useState<string>('Verifying your email address...');

  React.useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token in link.');
      return;
    }

    let isMounted = true;
    apiClient
      .post<{ message: string }>('/auth/verify-email', { token })
      .then((res) => {
        if (isMounted) {
          setStatus('success');
          setMessage(res.data.message || 'Email verified successfully!');
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setStatus('error');
          if (
            typeof err === 'object' &&
            err !== null &&
            'response' in err &&
            typeof (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message === 'string'
          ) {
            setMessage(
              (err as { response: { data: { message: string } } }).response.data
                .message,
            );
          } else {
            setMessage('Verification failed or link expired.');
          }
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="space-y-4 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Email Verified!
        </h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Link href="/dashboard" className="block pt-2">
          <Button className="w-full">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <XCircle className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        Verification Failed
      </h2>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link href="/login" className="block pt-2">
        <Button variant="outline" className="w-full">
          Back to Login
        </Button>
      </Link>
    </div>
  );
}

export default function VerifyEmailPage(): React.JSX.Element {
  return (
    <AuthLayout
      title="Email verification"
      description="Verifying your account details"
    >
      <React.Suspense
        fallback={
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        }
      >
        <VerifyEmailContent />
      </React.Suspense>
    </AuthLayout>
  );
}

