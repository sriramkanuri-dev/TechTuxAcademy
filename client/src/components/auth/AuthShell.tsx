import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, BookOpen, Sparkles, Terminal } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="container-page grid min-h-[calc(100vh-4rem)] items-center gap-12 py-12 lg:grid-cols-2 lg:py-16">
      <div className="mx-auto w-full max-w-md">
        <Logo className="mb-8 lg:hidden" />
        <h1 className="font-display text-3xl font-bold tracking-tight text-text">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
      </div>

      <div className="relative hidden overflow-hidden rounded-3xl border border-line/10 bg-gradient-to-br from-brand-500/15 via-card to-cyan-500/10 p-10 lg:block">
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden="true" />
        <div className="relative">
          <span className="eyebrow">
            <Sparkles className="h-3.5 w-3.5" /> Learn. Build. Innovate.
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold leading-tight text-text">
            Practical technology skills, explained without the noise.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted">
            Linux, programming, AI, electronics and cloud — structured into clear paths with
            real projects, Telugu support and verifiable certificates.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { icon: BookOpen, title: '15+ structured courses', body: '75 lessons and growing' },
              { icon: Terminal, title: 'Hands-on from lesson one', body: 'Real commands, real systems' },
              { icon: BadgeCheck, title: 'Certificates that verify', body: 'Unique ID + QR verification' },
            ].map(({ icon: Icon, title: itemTitle, body }) => (
              <div key={itemTitle} className="flex items-center gap-3 rounded-xl border border-line/10 bg-card/60 p-3.5 backdrop-blur">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-400/25 bg-brand-500/10 text-brand-300">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-text">{itemTitle}</p>
                  <p className="text-xs text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-xs text-muted">
            By continuing you agree to learn with curiosity and respect.{' '}
            <Link to="/about" className="text-brand-300 hover:text-brand-200">
              About the academy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
