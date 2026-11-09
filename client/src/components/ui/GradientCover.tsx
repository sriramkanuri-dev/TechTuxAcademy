import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Deterministic generated cover art so the platform has zero external image
 * dependencies while still looking designed. Uses the category colour + a
 * stable hash of the seed string to vary the composition.
 */
export function GradientCover({
  seed,
  label,
  color = '#8b5cf6',
  className,
  icon,
}: {
  seed: string;
  label?: string;
  color?: string;
  className?: string;
  icon?: ReactNode;
}) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360;
  }
  const angle = 120 + (hash % 90);
  const second = `hsl(${(hash + 40) % 360} 80% 60%)`;

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl border border-line/10', className)}
      style={{
        background: `linear-gradient(${angle}deg, ${color}, ${second})`,
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6), transparent 35%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.35), transparent 45%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }}
      />
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full border border-white/20 bg-white/10 blur-sm" />
      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white/90">
        {icon}
        {label && <span className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</span>}
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 font-display text-5xl font-black text-white/15">
        {label?.slice(0, 2).toUpperCase() || 'TT'}
      </div>
    </div>
  );
}
