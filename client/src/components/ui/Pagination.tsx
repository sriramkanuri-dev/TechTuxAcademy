import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Pagination as PaginationMeta } from '@/lib/types';

export function Pagination({
  pagination,
  onPageChange,
  className,
}: {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const { page, pages } = pagination;
  if (pages <= 1) return null;

  const numbers: number[] = [];
  const start = Math.max(1, Math.min(page - 1, pages - 2));
  for (let index = start; index < start + 3 && index <= pages; index += 1) numbers.push(index);

  return (
    <nav className={cn('flex items-center justify-center gap-1.5', className)} aria-label="Pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line/10 text-muted transition hover:border-brand-400/40 hover:text-text disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {start > 1 && (
        <>
          <PageButton value={1} active={false} onClick={onPageChange} />
          {start > 2 && <span className="px-1 text-muted">…</span>}
        </>
      )}
      {numbers.map((number) => (
        <PageButton key={number} value={number} active={number === page} onClick={onPageChange} />
      ))}
      {start + 2 < pages && (
        <>
          {start + 3 < pages && <span className="px-1 text-muted">…</span>}
          <PageButton value={pages} active={false} onClick={onPageChange} />
        </>
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line/10 text-muted transition hover:border-brand-400/40 hover:text-text disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

function PageButton({ value, active, onClick }: { value: number; active: boolean; onClick: (page: number) => void }) {
  return (
    <button
      onClick={() => onClick(value)}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'h-9 min-w-9 rounded-lg border px-2 text-sm font-medium transition',
        active
          ? 'border-brand-400/50 bg-brand-500/15 text-brand-200'
          : 'border-line/10 text-muted hover:border-brand-400/40 hover:text-text'
      )}
    >
      {value}
    </button>
  );
}
