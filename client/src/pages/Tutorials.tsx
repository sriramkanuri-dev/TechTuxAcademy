import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Filter, Search, ScrollText, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Category, Pagination as PaginationMeta, Tutorial } from '@/lib/types';
import { SEO } from '@/components/seo/SEO';
import { PageHeader } from '@/components/ui/PageHeader';
import { TutorialCard } from '@/components/cards/TutorialCard';
import { CardSkeleton } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';

interface TutorialsResponse {
  tutorials: Tutorial[];
  pagination: PaginationMeta;
}

export default function Tutorials() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const page = Number(params.get('page') || 1);

  const update = (patch: Record<string, string | number>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === '' || (key === 'page' && Number(value) <= 1)) next.delete(key);
      else next.set(key, String(value));
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<{ categories: Category[] }>('/categories');
      return data.categories;
    },
    staleTime: 5 * 60_000,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tutorials', { q, category, page }],
    queryFn: async () => {
      const { data } = await api.get<TutorialsResponse>('/tutorials', {
        params: { search: q, category, page, limit: 9 },
      });
      return data;
    },
  });

  return (
    <>
      <SEO
        title="Tutorials"
        description="Practical Linux, programming, networking and electronics tutorials with clear explanations and copy-ready commands."
        path="/tutorials"
      />
      <PageHeader
        eyebrow="Tutorial library"
        title="Short, practical guides you can use today"
        description="Focused tutorials on Linux, networking, programming and hardware. Written to be read in one sitting and applied immediately."
        breadcrumb={[{ label: 'Tutorials' }]}
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-line/10 bg-surface/60 px-3 py-2 text-xs text-muted">
            <ScrollText className="h-4 w-4 text-cyan-300" />
            {data ? `${data.pagination.total} tutorials` : 'Loading tutorials…'}
          </div>
        }
      />

      <section className="container-page py-10">
        <div className="card-surface mb-8 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[1.8fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={q}
                onChange={(event) => update({ q: event.target.value })}
                placeholder="Search tutorials…"
                aria-label="Search tutorials"
                className="input-base pl-10"
              />
            </div>
            <select
              value={category}
              onChange={(event) => update({ category: event.target.value })}
              aria-label="Filter tutorials by category"
              className="input-base cursor-pointer"
            >
              <option value="">All categories</option>
              {categoriesData?.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          {(q || category) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted">Active filters:</span>
              {q && (
                <button onClick={() => update({ q: '' })} className="inline-flex items-center gap-1 rounded-full border border-line/10 bg-elevated px-2.5 py-1 text-muted hover:text-text">
                  “{q}” <X className="h-3 w-3" />
                </button>
              )}
              {category && (
                <button onClick={() => update({ category: '' })} className="inline-flex items-center gap-1 rounded-full border border-line/10 bg-elevated px-2.5 py-1 text-muted hover:text-text">
                  {categoriesData?.find((item) => item.slug === category)?.name || category} <X className="h-3 w-3" />
                </button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setParams({}, { replace: true })}>
                Clear all
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.tutorials.length === 0 ? (
          <EmptyState
            icon={Filter}
            title={t('common.noResults')}
            description={t('common.noResultsText')}
            action={
              <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.tutorials.map((tutorial) => (
                <TutorialCard key={tutorial.id} tutorial={tutorial} />
              ))}
            </div>
            <Pagination pagination={data.pagination} onPageChange={(next) => update({ page: next })} className="mt-10" />
          </>
        )}
      </section>
    </>
  );
}
