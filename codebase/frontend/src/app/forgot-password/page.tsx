'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { AuthLayout } from '../../components/layout/auth-layout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { apiClient } from '../../lib/api-client';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage(): React.JSX.Element {
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData): Promise<void> => {
    setErrorMessage(null);
    try {
      await apiClient.post('/auth/forgot-password', data);
      setIsSuccess(true);
    } catch {
      setErrorMessage('Failed to send reset link. Please try again.');
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your email address and we'll send you a password reset link"
    >
      {isSuccess ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Check your email
          </h2>
          <p className="text-sm text-muted-foreground">
            If an account exists with that email address, we have sent instructions to reset your password.
          </p>
          <Link href="/login" className="block pt-2">
            <Button variant="outline" className="w-full">
              Back to Login
            </Button>
          </Link>
        </div>
      ) : (
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
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="alex@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending link...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Remember your password?{' '}
            <Link
              href="/login"
              className="font-semibold text-primary hover:underline"
            >
              Back to Login
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
