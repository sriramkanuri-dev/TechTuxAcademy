import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { Tutorial } from '@/lib/types';
import { assetUrl } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { GradientCover } from '@/components/ui/GradientCover';
import { useLanguage } from '@/contexts/LanguageContext';

export function TutorialCard({ tutorial, className }: { tutorial: Tutorial; className?: string }) {
  const { pick } = useLanguage();
  const color = tutorial.category?.color || '#22d3ee';

  return (
    <Link
      to={`/tutorials/${tutorial.slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-line/10 bg-card shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand-400/40 hover:shadow-glow',
        className
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        {tutorial.image ? (
          <img
            src={assetUrl(tutorial.image)}
            alt={tutorial.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <GradientCover
            seed={tutorial.slug}
            label={tutorial.category?.name || 'Tutorial'}
            color={color}
            className="h-full w-full rounded-none border-0"
          />
        )}
        <span className="absolute left-3 top-3 rounded-full border border-line/10 bg-black/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
          {tutorial.category?.name || 'Tutorial'}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-text transition group-hover:text-brand-200">
          {pick(tutorial.title, tutorial.titleTe)}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">
          {pick(tutorial.excerpt, tutorial.excerptTe)}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-muted">
          <span>{tutorial.author?.name || 'TechTuxAcademy'}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {tutorial.readMinutes} min read
          </span>
        </div>
        {tutorial.createdAt && (
          <p className="mt-1 text-[11px] text-muted/70">{formatDate(tutorial.createdAt)}</p>
        )}
      </div>
    </Link>
  );
}
