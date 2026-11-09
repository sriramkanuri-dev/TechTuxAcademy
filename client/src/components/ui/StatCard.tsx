import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'brand',
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  tone?: 'brand' | 'cyan' | 'green' | 'amber' | 'rose' | 'blue';
  className?: string;
}) {
  const tones = {
    brand: 'border-brand-400/25 bg-brand-500/10 text-brand-300',
    cyan: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-300',
    green: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
    amber: 'border-amber-400/25 bg-amber-500/10 text-amber-300',
    rose: 'border-rose-400/25 bg-rose-500/10 text-rose-300',
    blue: 'border-blue-400/25 bg-blue-500/10 text-blue-300',
  };

  return (
    <div className={cn('card-surface flex items-start gap-4 p-5', className)}>
      {Icon && (
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border', tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold text-text">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}
