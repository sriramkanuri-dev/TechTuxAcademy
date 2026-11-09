import { cn } from '@/lib/utils';

export function ProgressBar({
  value,
  className,
  showLabel = false,
  size = 'md',
}: {
  value: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const heights = { sm: 'h-1', md: 'h-2', lg: 'h-2.5' };
  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn('w-full overflow-hidden rounded-full bg-line/10', heights[size])}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-brand-gradient transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && <p className="mt-1 text-right text-xs font-medium text-muted">{clamped}% complete</p>}
    </div>
  );
}
