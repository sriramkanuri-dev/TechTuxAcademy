import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto rounded-xl border border-line/10 bg-surface/60 p-1', className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            'shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition',
            value === item.id
              ? 'bg-brand-500/15 text-brand-200 shadow-sm'
              : 'text-muted hover:bg-line/5 hover:text-text'
          )}
        >
          {item.label}
          {typeof item.count === 'number' && (
            <span className="ml-1.5 text-xs opacity-70">{item.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
