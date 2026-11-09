import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { BlogPost } from '@/lib/types';
import { assetUrl } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { GradientCover } from '@/components/ui/GradientCover';
import { useLanguage } from '@/contexts/LanguageContext';

export function PostCard({ post, className }: { post: BlogPost; className?: string }) {
  const { pick } = useLanguage();
  const color = post.category?.color || '#8b5cf6';

  return (
    <Link
      to={`/blog/${post.slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-line/10 bg-card shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand-400/40 hover:shadow-glow',
        className
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        {post.coverImage ? (
          <img
            src={assetUrl(post.coverImage)}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <GradientCover
            seed={post.slug}
            label={post.category?.name || 'Article'}
            color={color}
            className="h-full w-full rounded-none border-0"
          />
        )}
        {post.featured && (
          <span className="absolute right-3 top-3 rounded-full border border-amber-400/30 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100 backdrop-blur">
            Featured
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-300">
          {post.category?.name || 'Technology'}
        </span>
        <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-text transition group-hover:text-brand-200">
          {pick(post.title, post.titleTe)}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">
          {pick(post.excerpt, post.excerptTe)}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-muted">
          <span>{post.author?.name || 'TechTuxAcademy'}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.readMinutes} min read
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted/70">{formatDate(post.publishedAt)}</p>
      </div>
    </Link>
  );
}
