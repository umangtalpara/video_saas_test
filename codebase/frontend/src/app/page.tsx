import Link from 'next/link';
import { ArrowRight, Key, ShieldCheck, Sparkles, Video } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ThemeToggle } from '../components/ui/theme-toggle';

export default function HomePage(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b px-6 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Video className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">VideoForge AI</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 py-24 text-center lg:py-32">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Multi-Provider Video SaaS with BYOK Security</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
              Turn Text & Ideas Into <br />
              <span className="text-primary">Authentic AI Moving Video</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Generate 30 to 120-second vertical reels, square, and landscape videos
              using your own provider credentials. Zero pan-and-zoom image tricks. Real
              moving clips, automated script planning, and private S3 storage.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  <span>Start Creating Videos</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Access Dashboard
                </Button>
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 text-left shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Key className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">Bring Your Own Key</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect your own Alibaba Wan, Google, or NVIDIA API keys. AES-256-GCM
                encrypted at rest with zero platform markups.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 text-left shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Video className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">100% Real Moving Clips</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Every generated scene is an authentic video asset verified with ffprobe.
                No still image slideshows or pan-and-zoom animations.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 text-left shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">Tenant Isolated S3</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                All media assets and final MP4 videos are safely stored with
                tenant-scoped keys and short-lived presigned download links.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © 2026 VideoForge AI. Enterprise Multi-Provider SaaS Platform.
      </footer>
    </div>
  );
}
