'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckCircle2, Loader2, User } from 'lucide-react';
import { DashboardLayout } from '../../../components/layout/dashboard-layout';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { useAuthStore, UserProfile } from '../../../stores/auth-store';
import { apiClient } from '../../../lib/api-client';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  language: z.string().min(2, 'Please select a language'),
  timezone: z.string().min(1, 'Timezone is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileSettingsPage(): React.JSX.Element {
  const { user, updateUser, isAuthenticated } = useAuthStore();
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      language: user?.preferences?.language || 'en',
      timezone: user?.preferences?.timezone || 'UTC',
    },
  });

  React.useEffect(() => {
    let isMounted = true;
    apiClient
      .get<UserProfile>('/auth/me')
      .then((res) => {
        if (isMounted) {
          updateUser(res.data);
          reset({
            name: res.data.name,
            language: res.data.preferences?.language || 'en',
            timezone: res.data.preferences?.timezone || 'UTC',
          });
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reset, updateUser]);

  const onSubmit = async (data: ProfileFormData): Promise<void> => {
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      updateUser({
        name: data.name,
        preferences: {
          language: data.language,
          timezone: data.timezone,
          theme: user?.preferences?.theme || 'system',
        },
      });
      setSuccessMessage('Profile settings saved successfully');
    } catch {
      setErrorMessage('Failed to update profile settings');
    }
  };

  if (!isAuthenticated && !isLoading) {
    return (
      <DashboardLayout>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Please sign in to view your profile settings.</p>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Account Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your personal profile, credentials, and UI preferences
          </p>
        </div>

        {successMessage ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>{successMessage}</span>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Account Overview</CardTitle>
              <CardDescription>Your registered account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Role:</span>
                  <Badge variant="outline" className="capitalize">
                    {user?.role || 'user'}
                  </Badge>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant={user?.status === 'active' ? 'success' : 'warning'}
                    className="capitalize"
                  >
                    {user?.status || 'pending'}
                  </Badge>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Email Verified:</span>
                  <span className="font-medium">
                    {user?.emailVerifiedAt ? 'Yes' : 'Pending'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Update your personal information and locale</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-xs font-semibold text-muted-foreground">
                      Full Name
                    </label>
                    <Input id="name" error={errors.name?.message} {...register('name')} />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                      Email Address (Read Only)
                    </label>
                    <Input id="email" value={user?.email || ''} disabled readOnly />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="language" className="text-xs font-semibold text-muted-foreground">
                        Preferred Language
                      </label>
                      <Input
                        id="language"
                        placeholder="en"
                        error={errors.language?.message}
                        {...register('language')}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="timezone" className="text-xs font-semibold text-muted-foreground">
                        Timezone
                      </label>
                      <Input
                        id="timezone"
                        placeholder="UTC"
                        error={errors.timezone?.message}
                        {...register('timezone')}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving changes...
                        </>
                      ) : (
                        'Save Profile'
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
