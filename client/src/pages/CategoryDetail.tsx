import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, FolderTree, Newspaper, ScrollText } from 'lucide-react';
import { api } from '@/lib/api';
import type { BlogPost, Category, Course, Tutorial } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEO } from '@/components/seo/SEO';
import { PageHeader } from '@/components/ui/PageHeader';
import { CourseCard } from '@/components/cards/CourseCard';
import { TutorialCard } from '@/components/cards/TutorialCard';
import { PostCard } from '@/components/cards/PostCard';
import { CardSkeleton } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

interface CategoryDetail extends Category {
  courses: Course[];
  tutorials: Tutorial[];
  posts: BlogPost[];
}

export default function CategoryDetailPage() {
  const { slug = '' } = useParams();
  const { pick } = useLanguage();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const { data } = await api.get<{ category: CategoryDetail }>(`/categories/${slug}`);
      return data.category;
    },
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return (
      <div className="container-page py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container-page py-20">
        <ErrorState title="Category not found" description="This learning path may have been renamed or removed." onRetry={() => refetch()} />
      </div>
    );
  }

  const name = pick(data.name, data.nameTe);
  const description = pick(data.description, data.descriptionTe);
  const category = { ...data, courses: undefined, tutorials: undefined, posts: undefined } as unknown as Category;

  return (
    <>
      <SEO
        title={`${name} courses and tutorials`}
        description={description}
        path={`/categories/${slug}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${name} — TechTuxAcademy`,
          description,
        }}
      />

      <div className="border-b border-line/10 bg-surface/30">
        <div className="container-page py-10">
          <nav className="mb-5 flex items-center gap-1 text-xs text-muted" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-text">Home</Link>
            <ArrowRight className="h-3 w-3" />
            <Link to="/categories" className="hover:text-text">Categories</Link>
            <ArrowRight className="h-3 w-3" />
            <span className="text-text/80">{name}</span>
          </nav>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <CategoryIcon name={data.icon} color={data.color} className="h-16 w-16 shrink-0" />
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">{name}</h1>
              <p className="mt-3 max-w-3xl text-base leading-8 text-muted">{description}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" /> {data._count?.courses ?? data.courses.length} courses
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ScrollText className="h-4 w-4" /> {data._count?.tutorials ?? data.tutorials.length} tutorials
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Newspaper className="h-4 w-4" /> {data._count?.posts ?? data.posts.length} articles
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page space-y-14 py-12">
        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-text">Courses</h2>
            <Link to={`/courses?category=${slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-300 hover:text-brand-200">
              View in catalogue <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {data.courses.length === 0 ? (
            <EmptyState icon={BookOpen} title="No courses yet" description="Courses for this path are being prepared." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>

        {data.tutorials.length > 0 && (
          <section>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="font-display text-2xl font-bold text-text">Tutorials</h2>
              <Link to={`/tutorials?category=${slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-300 hover:text-brand-200">
                All tutorials <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.tutorials.map((tutorial) => (
                <TutorialCard key={tutorial.id} tutorial={{ ...tutorial, category }} />
              ))}
            </div>
          </section>
        )}

        {data.posts.length > 0 && (
          <section>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="font-display text-2xl font-bold text-text">Articles</h2>
              <Link to={`/blog?category=${slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-300 hover:text-brand-200">
                All articles <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.posts.map((post) => (
                <PostCard key={post.id} post={{ ...post, category }} />
              ))}
            </div>
          </section>
        )}

        {data.courses.length === 0 && data.tutorials.length === 0 && data.posts.length === 0 && (
          <EmptyState icon={FolderTree} title="This path is being built" description="New content is added regularly. Explore another category in the meantime." />
        )}
      </div>
    </>
  );
}
