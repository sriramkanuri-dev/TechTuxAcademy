import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Clock, FileText, FolderTree, Search as SearchIcon, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDuration } from '@/lib/utils';
import { SEO } from '@/components/seo/SEO';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Badge, DifficultyBadge } from '@/components/ui/Badge';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { GradientCover } from '@/components/ui/GradientCover';
import { useLanguage } from '@/contexts/LanguageContext';

interface SearchCourse {
  id: string;
  slug: string;
  title: string;
  titleTe?: string | null;
  description: string;
  thumbnail?: string | null;
  difficulty: string;
  durationMinutes: number;
  category: { name: string; slug: string; color: string } | null;
  instructor: { name: string } | null;
  _count: { lessons: number };
}

interface SearchTutorial {
  id: string;
  slug: string;
  title: string;
  titleTe?: string | null;
  excerpt: string;
  image?: string | null;
  readMinutes: number;
  category: { name: string; slug: string; color: string } | null;
}

interface SearchPost {
  id: string;
  slug: string;
  title: string;
  titleTe?: string | null;
  excerpt: string;
  coverImage?: string | null;
  readMinutes: number;
  publishedAt: string;
  category: { name: string; slug: string; color: string } | null;
}

interface SearchCategory {
  id: string;
  slug: string;
  name: string;
  nameTe?: string | null;
  description: string;
  color: string;
  icon: string;
  _count: { courses: number; tutorials: number };
}

interface SearchResponse {
  query: string;
  courses: SearchCourse[];
  tutorials: SearchTutorial[];
  posts: SearchPost[];
  categories: SearchCategory[];
}

const popular = ['Linux', 'Python', 'React', 'VLSI', 'Docker', 'AI', 'Networking', 'Embedded'];

export default function SearchPage() {
  const { pick } = useLanguage();
  const [params, setParams] = useSearchParams();
  const initial = params.get('q') || '';
  const type = params.get('type') || 'all';
  const [input, setInput] = useState(initial);
  const [debounced, setDebounced] = useState(initial);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(input.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (debounced.length >= 2) next.set('q', debounced);
    else next.delete('q');
    if (type !== 'all') next.set('type', type);
    else next.delete('type');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, type]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced, type],
    queryFn: async () => {
      const { data } = await api.get<SearchResponse>('/search', {
        params: { q: debounced, type, limit: 12 },
      });
      return data;
    },
    enabled: debounced.length >= 2,
  });

  const totals = {
    courses: data?.courses.length || 0,
    tutorials: data?.tutorials.length || 0,
    posts: data?.posts.length || 0,
    categories: data?.categories.length || 0,
  };
  const total = totals.courses + totals.tutorials + totals.posts + totals.categories;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setDebounced(input.trim());
  };

  const setType = (next: string) => {
    const nextParams = new URLSearchParams(params);
    if (next === 'all') nextParams.delete('type');
    else nextParams.set('type', next);
    setParams(nextParams, { replace: true });
  };

  const tabs = [
    { id: 'all', label: 'All', count: total },
    { id: 'courses', label: 'Courses', count: totals.courses },
    { id: 'tutorials', label: 'Tutorials', count: totals.tutorials },
    { id: 'posts', label: 'Articles', count: totals.posts },
    { id: 'categories', label: 'Categories', count: totals.categories },
  ];

  return (
    <>
      <SEO
        title={initial ? `Search: ${initial}` : 'Search'}
        description="Search across TechTuxAcademy courses, tutorials, articles and learning paths."
        path="/search"
        noIndex
      />

      <section className="relative overflow-hidden border-b border-line/10 bg-surface/30">
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden="true" />
        <div className="container-page relative py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">
              <SearchIcon className="h-3.5 w-3.5" /> Global search
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Find the next thing to learn
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted">
              Search courses, tutorials, articles and learning paths across the academy.
            </p>

            <form onSubmit={submit} className="relative mt-7">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Try “Linux permissions”, “React hooks”, “RTL design”…"
                aria-label="Search the academy"
                className="h-14 w-full rounded-2xl border border-line/10 bg-card pl-12 pr-28 text-sm text-text shadow-card placeholder:text-muted/60 focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {input && (
                <button
                  type="button"
                  onClick={() => {
                    setInput('');
                    setDebounced('');
                  }}
                  className="absolute right-[92px] top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-text"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-white"
              >
                Search
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Popular:
              </span>
              {popular.map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setInput(term);
                    setDebounced(term);
                  }}
                  className="rounded-full border border-line/10 bg-card px-2.5 py-1 transition hover:border-brand-400/40 hover:text-text"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        {debounced.length >= 2 && (
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs items={tabs} value={type} onChange={setType} />
            <p className="flex items-center gap-2 text-xs text-muted">
              {isFetching && <Spinner className="h-3.5 w-3.5" />}
              {data ? `${total} result${total === 1 ? '' : 's'} for “${data.query}”` : 'Searching…'}
            </p>
          </div>
        )}

        {debounced.length < 2 ? (
          <div className="mx-auto max-w-2xl py-10 text-center">
            <EmptyState
              icon={SearchIcon}
              title="Start typing to search"
              description="Enter at least two characters. You can search by course title, topic, tag, tutorial or learning path."
            />
          </div>
        ) : isFetching && !data ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : total === 0 ? (
          <EmptyState
            icon={SearchIcon}
            title="No results found"
            description={`Nothing matched “${debounced}”. Try a broader term, check the spelling, or browse the course catalogue.`}
          />
        ) : (
          <div className="space-y-12">
            {(type === 'all' || type === 'courses') && data && data.courses.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-text">
                  <BookOpen className="h-5 w-5 text-brand-300" /> Courses
                  <span className="text-sm font-normal text-muted">({data.courses.length})</span>
                </h2>
                <div className="space-y-3">
                  {data.courses.map((course) => (
                    <Link
                      key={course.id}
                      to={`/courses/${course.slug}`}
                      className="group flex flex-col gap-4 rounded-2xl border border-line/10 bg-card p-4 transition hover:border-brand-400/40 hover:shadow-glow sm:flex-row sm:items-center"
                    >
                      <GradientCover
                        seed={course.slug}
                        label={course.category?.name}
                        color={course.category?.color || '#8b5cf6'}
                        className="h-20 w-full shrink-0 rounded-xl sm:w-32"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <DifficultyBadge difficulty={course.difficulty} />
                          {course.category && <Badge tone="brand">{course.category.name}</Badge>}
                        </div>
                        <h3 className="mt-1.5 font-display text-base font-semibold text-text transition group-hover:text-brand-200">
                          {pick(course.title, course.titleTe)}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{course.description}</p>
                        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                          <span>{course._count.lessons} lessons</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatDuration(course.durationMinutes)}
                          </span>
                          <span>By {course.instructor?.name || 'TechTuxAcademy'}</span>
                        </p>
                      </div>
                      <ArrowRight className="hidden h-5 w-5 shrink-0 text-muted transition group-hover:text-brand-300 sm:block" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {(type === 'all' || type === 'tutorials') && data && data.tutorials.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-text">
                  <FileText className="h-5 w-5 text-cyan-300" /> Tutorials
                  <span className="text-sm font-normal text-muted">({data.tutorials.length})</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.tutorials.map((tutorial) => (
                    <Link
                      key={tutorial.id}
                      to={`/tutorials/${tutorial.slug}`}
                      className="group rounded-2xl border border-line/10 bg-card p-4 transition hover:border-brand-400/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone="cyan">{tutorial.category?.name || 'Tutorial'}</Badge>
                        <span className="inline-flex items-center gap-1 text-xs text-muted">
                          <Clock className="h-3 w-3" /> {tutorial.readMinutes} min
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-sm font-semibold text-text transition group-hover:text-brand-200">
                        {pick(tutorial.title, tutorial.titleTe)}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted">{tutorial.excerpt}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {(type === 'all' || type === 'posts') && data && data.posts.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-text">
                  <FileText className="h-5 w-5 text-brand-300" /> Articles
                  <span className="text-sm font-normal text-muted">({data.posts.length})</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.posts.map((post) => (
                    <Link
                      key={post.id}
                      to={`/blog/${post.slug}`}
                      className="group rounded-2xl border border-line/10 bg-card p-4 transition hover:border-brand-400/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone="brand">{post.category?.name || 'Article'}</Badge>
                        <span className="inline-flex items-center gap-1 text-xs text-muted">
                          <Clock className="h-3 w-3" /> {post.readMinutes} min
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-sm font-semibold text-text transition group-hover:text-brand-200">
                        {pick(post.title, post.titleTe)}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted">{post.excerpt}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {(type === 'all' || type === 'categories') && data && data.categories.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-text">
                  <FolderTree className="h-5 w-5 text-emerald-300" /> Learning paths
                  <span className="text-sm font-normal text-muted">({data.categories.length})</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.categories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/categories/${category.slug}`}
                      className={cn('group flex items-start gap-3 rounded-2xl border border-line/10 bg-card p-4 transition hover:border-brand-400/40')}
                    >
                      <CategoryIcon name={category.icon} color={category.color} className="h-10 w-10 shrink-0" />
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-semibold text-text transition group-hover:text-brand-200">
                          {pick(category.name, category.nameTe)}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{category.description}</p>
                        <p className="mt-1.5 text-[11px] text-muted">
                          {category._count.courses} courses · {category._count.tutorials} tutorials
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </section>
    </>
  );
}
