import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { ArrowRight, BookOpen, FileText, FolderTree, Loader2, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Suggestion {
  type: 'course' | 'tutorial' | 'article' | 'category';
  label: string;
  slug: string;
  meta?: string;
}

const icons = {
  course: BookOpen,
  tutorial: FileText,
  article: FileText,
  category: FolderTree,
};

const routes = {
  course: (slug: string) => `/courses/${slug}`,
  tutorial: (slug: string) => `/tutorials/${slug}`,
  article: (slug: string) => `/blog/${slug}`,
  category: (slug: string) => `/categories/${slug}`,
};

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setDebounced(query.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const { data, isFetching } = useQuery({
    queryKey: ['search-suggest', debounced],
    queryFn: async () => {
      const { data } = await api.get<{ suggestions: Suggestion[] }>('/search/suggest', {
        params: { q: debounced },
      });
      return data.suggestions;
    },
    enabled: open && debounced.length >= 2,
    staleTime: 30_000,
  });

  const go = (path: string) => {
    onClose();
    setQuery('');
    navigate(path);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    go(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl border border-line/15 bg-card shadow-2xl">
        <form onSubmit={submit} className="flex items-center gap-3 border-b border-line/10 px-4">
          <Search className="h-5 w-5 shrink-0 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search courses, tutorials and articles…"
            aria-label="Search"
            className="h-14 flex-1 bg-transparent text-sm text-text placeholder:text-muted/60 focus:outline-none"
          />
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-brand-300" />}
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-line/10 hover:text-text" aria-label="Close search">
            <X className="h-4 w-4" />
          </button>
        </form>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {debounced.length < 2 ? (
            <div className="px-3 py-8 text-center text-sm text-muted">
              Type at least two characters to search across the academy.
            </div>
          ) : data && data.length > 0 ? (
            <ul className="space-y-0.5">
              {data.map((item) => {
                const Icon = icons[item.type];
                return (
                  <li key={`${item.type}-${item.slug}`}>
                    <button
                      onClick={() => go(routes[item.type](item.slug))}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-line/5"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line/10 bg-elevated text-brand-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text">{item.label}</span>
                        <span className="block text-xs capitalize text-muted">{item.meta || item.type}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : !isFetching ? (
            <div className="px-3 py-8 text-center text-sm text-muted">
              No matches for “{debounced}”. Press Enter to see the full search page.
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-line/10 px-4 py-2.5 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="rounded border border-line/15 bg-elevated px-1.5 py-0.5 font-mono">↵</kbd>
            full search
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="rounded border border-line/15 bg-elevated px-1.5 py-0.5 font-mono">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
