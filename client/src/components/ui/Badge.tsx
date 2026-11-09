import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'brand' | 'blue' | 'cyan' | 'green' | 'amber' | 'rose' | 'neutral';

const tones: Record<Tone, string> = {
  brand: 'border-brand-400/30 bg-brand-500/10 text-brand-200',
  blue: 'border-blue-400/30 bg-blue-500/10 text-blue-200',
  cyan: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200',
  green: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  amber: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  rose: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
  neutral: 'border-line/15 bg-line/5 text-muted',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const tone: Tone =
    difficulty === 'BEGINNER' ? 'green' : difficulty === 'INTERMEDIATE' ? 'amber' : 'rose';
  return <Badge tone={tone}>{difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}</Badge>;
}
