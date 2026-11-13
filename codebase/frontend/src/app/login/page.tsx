'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { AuthLayout } from '../../components/layout/auth-layout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { apiClient } from '../../lib/api-client';
import { useAuthStore, UserProfile, AuthTokens } from '../../stores/auth-store';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    setErrorMessage(null);
    try {
      const response = await apiClient.post<{
        user: UserProfile;
        tokens: AuthTokens;
      }>('/auth/login', data);

      const { user, tokens } = response.data;
      setAuth(user, tokens);
      router.push('/dashboard');
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
        setErrorMessage('Invalid email or password');
      }
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to your VideoForge AI account"
    >
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-semibold text-primary hover:underline"
          >
            Create account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

