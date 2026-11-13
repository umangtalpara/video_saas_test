'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar className="sticky top-0" />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
