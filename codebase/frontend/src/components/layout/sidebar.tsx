'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Film,
  Key,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  Video,
  Shield,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';
import { Button } from '../ui/button';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Create Video', href: '/videos/new', icon: Sparkles },
  { title: 'My Videos', href: '/videos', icon: Film },
  { title: 'Providers', href: '/providers', icon: Video },
  { title: 'Usage & Quota', href: '/usage', icon: BarChart3 },
  { title: 'API Keys (BYOK)', href: '/settings/providers', icon: Key },
  { title: 'Profile Settings', href: '/settings/profile', icon: Settings },
  { title: 'Admin Console', href: '/admin', icon: Shield, adminOnly: true },
];

export function Sidebar({ className }: { className?: string }): React.JSX.Element {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = (): void => {
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <aside
      className={cn(
        'flex h-screen w-64 flex-col border-r bg-card px-4 py-6 text-card-foreground',
        className,
      )}
    >
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
          <Video className="h-5 w-5" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight">VideoForge AI</span>
          <span className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
            BYOK Studio
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') {
            return null;
          }
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t pt-4">
        {user ? (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
              </div>
              <div className="truncate text-xs">
                <p className="truncate font-semibold text-foreground">{user.name}</p>
                <p className="truncate text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Link href="/login" className="block">
            <Button variant="default" className="w-full">
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </aside>
  );
}
