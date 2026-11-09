import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Compass, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Category, Course, Pagination as PaginationMeta } from '@/lib/types';
import { SEO } from '@/components/seo/SEO';
import { PageHeader } from '@/components/ui/PageHeader';
import { CourseCard } from '@/components/cards/CourseCard';
import { CardSkeleton } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';

interface CoursesResponse {
  courses: Course[];
  pagination: PaginationMeta;
}

const difficulties = [
  { value: '', label: 'All levels' },
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const sorts = [
  { value: 'newest', label: 'Newest first' },
  { value: 'popular', label: 'Most popular' },
  { value: 'az', label: 'Title A–Z' },
];

export default function Courses() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const difficulty = params.get('difficulty') || '';
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page') || 1);

  const update = (patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '' || (key === 'page' && Number(value) <= 1)) next.delete(key);
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
    queryKey: ['courses', { q, category, difficulty, sort, page }],
    queryFn: async () => {
      const { data } = await api.get<CoursesResponse>('/courses', {
        params: { search: q, category, difficulty, sort, page, limit: 12 },
      });
      return data;
    },
  });

  const activeFilters = [q, category, difficulty].filter(Boolean).length;

  return (
    <>
      <SEO
        title="Courses"
        description="Browse practical technology courses in Linux, programming, AI, electronics, VLSI, DevOps and cybersecurity. Learn in English or Telugu."
        path="/courses"
      />
      <PageHeader
        eyebrow="Course catalogue"
        title="Learn a skill you can actually use"
        description="Structured, self-paced courses with video lessons, written notes and verifiable certificates. Filter by category or level to find your next path."
        breadcrumb={[{ label: 'Courses' }]}
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-line/10 bg-surface/60 px-3 py-2 text-xs text-muted">
            <Compass className="h-4 w-4 text-brand-300" />
            {data ? `${data.pagination.total} published courses` : 'Loading catalogue…'}
          </div>
        }
      />

      <section className="container-page py-10">
        <div className="card-surface mb-8 p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={q}
                onChange={(event) => update({ q: event.target.value })}
                placeholder="Search courses by title, topic or tag…"
                aria-label="Search courses"
                className="input-base pl-10"
              />
            </div>
            <select
              value={category}
              onChange={(event) => update({ category: event.target.value })}
              aria-label="Filter by category"
              className="input-base cursor-pointer"
            >
              <option value="">All categories</option>
              {categoriesData?.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              value={difficulty}
              onChange={(event) => update({ difficulty: event.target.value })}
              aria-label="Filter by difficulty"
              className="input-base cursor-pointer"
            >
              {difficulties.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(event) => update({ sort: event.target.value })}
              aria-label="Sort courses"
              className="input-base cursor-pointer"
            >
              {sorts.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {activeFilters > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-muted">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Active filters:
              </span>
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
              {difficulty && (
                <button onClick={() => update({ difficulty: '' })} className="inline-flex items-center gap-1 rounded-full border border-line/10 bg-elevated px-2.5 py-1 text-muted hover:text-text">
                  {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()} <X className="h-3 w-3" />
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
        ) : !data || data.courses.length === 0 ? (
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
              {data.courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
            <Pagination
              pagination={data.pagination}
              onPageChange={(next) => update({ page: next })}
              className="mt-10"
            />
          </>
        )}
      </section>
    </>
  );
}
