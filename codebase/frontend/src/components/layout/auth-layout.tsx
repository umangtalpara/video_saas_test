import * as React from 'react';
import Link from 'next/link';
import { Video } from 'lucide-react';
import { Card } from '../ui/card';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthLayout({
  title,
  description,
  children,
}: AuthLayoutProps): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-primary p-2 text-primary-foreground shadow"
          >
            <Video className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <Card className="p-6 shadow-md">{children}</Card>
      </div>
    </div>
  );
}

