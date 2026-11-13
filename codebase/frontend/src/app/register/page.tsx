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

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Must contain uppercase, lowercase, number, and special character',
    ),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage(): React.JSX.Element {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    setErrorMessage(null);
    try {
      const response = await apiClient.post<{
        user: UserProfile;
        tokens: AuthTokens;
      }>('/auth/register', data);

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
        setErrorMessage('Failed to create account. Please try again.');
      }
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      description="Start generating authentic AI videos with your own API keys"
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
            htmlFor="name"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Full Name
          </label>
          <Input
            id="name"
            placeholder="Alex Smith"
            error={errors.name?.message}
            {...register('name')}
          />
        </div>

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
          <label
            htmlFor="password"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Password
          </label>
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
              Creating account...
            </>
          ) : (
            'Sign Up'
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
