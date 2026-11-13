'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { AuthLayout } from '../../components/layout/auth-layout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { apiClient } from '../../lib/api-client';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        'Must contain uppercase, lowercase, number, and special character',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm(): React.JSX.Element {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData): Promise<void> => {
    if (!token) {
      setErrorMessage('Missing password reset token in URL');
      return;
    }
    setErrorMessage(null);
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword: data.password,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response
          ?.data?.message === 'string'
      ) {
        setErrorMessage(
          (err as { response: { data: { message: string } } }).response.data
            .message,
        );
      } else {
        setErrorMessage('Failed to reset password. The token may be expired.');
      }
    }
  };

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-destructive">
          Invalid or missing reset token. Please request a new password reset link.
        </p>
        <Link href="/forgot-password">
          <Button variant="outline" className="w-full">
            Request Reset Link
          </Button>
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Password updated!
        </h2>
        <p className="text-sm text-muted-foreground">
          Your password has been changed successfully. You can now sign in with your new credentials.
        </p>
        <Link href="/login" className="block pt-2">
          <Button className="w-full">Sign In Now</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errorMessage ? (
        <div
          className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          New Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Confirm New Password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating password...
          </>
        ) : (
          'Set New Password'
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage(): React.JSX.Element {
  return (
    <AuthLayout
      title="Create new password"
      description="Choose a strong password for your account"
    >
      <React.Suspense
        fallback={
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        }
      >
        <ResetPasswordForm />
      </React.Suspense>
    </AuthLayout>
  );
}
