import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Filter, Newspaper, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { BlogPost, Category, Pagination as PaginationMeta } from '@/lib/types';
import { SEO } from '@/components/seo/SEO';
import { PageHeader } from '@/components/ui/PageHeader';
import { PostCard } from '@/components/cards/PostCard';
import { CardSkeleton } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';

interface PostsResponse {
  posts: BlogPost[];
  pagination: PaginationMeta;
}

export default function Blog() {
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
    queryKey: ['posts', { q, category, page }],
    queryFn: async () => {
      const { data } = await api.get<PostsResponse>('/posts', {
        params: { search: q, category, page, limit: 9 },
      });
      return data;
    },
  });

  const featured = data?.posts.find((post) => post.featured);
  const rest = data?.posts.filter((post) => post.id !== featured?.id) || [];

  return (
    <>
      <SEO
        title="Blog"
        description="Ideas, deep dives and career notes on Linux, programming, AI, electronics and building a technology career."
        path="/blog"
      />
      <PageHeader
        eyebrow="Writing"
        title="Notes from the workshop"
        description="Longer-form articles on technology, learning and the craft of building reliable systems."
        breadcrumb={[{ label: 'Blog' }]}
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-line/10 bg-surface/60 px-3 py-2 text-xs text-muted">
            <Newspaper className="h-4 w-4 text-brand-300" />
            {data ? `${data.pagination.total} articles` : 'Loading articles…'}
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
                placeholder="Search articles…"
                aria-label="Search articles"
                className="input-base pl-10"
              />
            </div>
            <select
              value={category}
              onChange={(event) => update({ category: event.target.value })}
              aria-label="Filter articles by category"
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
        ) : !data || data.posts.length === 0 ? (
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
            {featured && (
              <div className="mb-8">
                <PostCard post={featured} className="lg:grid lg:grid-cols-2" />
              </div>
            )}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            <Pagination pagination={data.pagination} onPageChange={(next) => update({ page: next })} className="mt-10" />
          </>
        )}
      </section>
    </>
  );
}
