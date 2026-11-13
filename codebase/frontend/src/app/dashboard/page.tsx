'use client';

import * as React from 'react';
import Link from 'next/link';
import { Film, Key, Sparkles, Video } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../stores/auth-store';

export default function DashboardPage(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name || 'Creator'}!
            </h1>
            <p className="text-sm text-muted-foreground">
              Create video reels and manage your BYOK AI provider connections
            </p>
          </div>
          <Link href="/videos/new">
            <Button className="gap-2 shadow">
              <Sparkles className="h-4 w-4" />
              <span>Create Video</span>
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Film className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">0 generated videos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Videos Generating</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Active worker jobs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Connected Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">BYOK provider accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <Film className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0 MB</div>
              <p className="text-xs text-muted-foreground">Private S3 bucket</p>
            </CardContent>
          </Card>
        </div>

        <Card className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No video projects yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Connect your AI provider API key, enter a text prompt, and start generating
            moving AI video reels.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link href="/settings/providers">
              <Button variant="outline" className="gap-2">
                <Key className="h-4 w-4" />
                <span>Connect API Key</span>
              </Button>
            </Link>
            <Link href="/videos/new">
              <Button className="gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Create First Video</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
