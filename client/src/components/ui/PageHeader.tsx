import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  breadcrumb,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  breadcrumb?: { label: string; to?: string }[];
  className?: string;
}) {
  return (
    <div className={cn('border-b border-line/10 bg-surface/30', className)}>
      <div className="container-page py-10 sm:py-12">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted" aria-label="Breadcrumb">
            <Link to="/" className="transition hover:text-text">
              Home
            </Link>
            {breadcrumb.map((item) => (
              <span key={`${item.label}-${item.to || ''}`} className="inline-flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                {item.to ? (
                  <Link to={item.to} className="transition hover:text-text">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-text/80">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
            <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">{title}</h1>
            {description && <p className="mt-3 text-base leading-7 text-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
