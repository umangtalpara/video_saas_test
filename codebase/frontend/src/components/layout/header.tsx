'use client';

import * as React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '../ui/button';
import { ThemeToggle } from '../ui/theme-toggle';
import { MobileDrawer } from './mobile-drawer';

export function Header(): React.JSX.Element {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold tracking-tight text-foreground md:hidden">
            VideoForge AI
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <MobileDrawer
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
    </>
  );
}

