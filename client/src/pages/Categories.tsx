import { useQuery } from '@tanstack/react-query';
import { FolderTree } from 'lucide-react';
import { api } from '@/lib/api';
import type { Category } from '@/lib/types';
import { SEO } from '@/components/seo/SEO';
import { PageHeader } from '@/components/ui/PageHeader';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { CardSkeleton } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

export default function Categories() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<{ categories: Category[] }>('/categories');
      return data.categories;
    },
  });

  const featured = data?.filter((category) => category.featured) || [];
  const rest = data?.filter((category) => !category.featured) || [];

  return (
    <>
      <SEO
        title="Learning paths"
        description="Twenty focused technology categories: Linux, programming, AI, electronics, VLSI, IoT, cloud, cybersecurity and more."
        path="/categories"
      />
      <PageHeader
        eyebrow="Learning paths"
        title="Choose the path that fits where you want to go"
        description="Every category collects the courses, tutorials and articles that belong together, so you can move from fundamentals to advanced work without losing the thread."
        breadcrumb={[{ label: 'Categories' }]}
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-line/10 bg-surface/60 px-3 py-2 text-xs text-muted">
            <FolderTree className="h-4 w-4 text-brand-300" />
            {data ? `${data.length} categories` : 'Loading categories…'}
          </div>
        }
      />

      <section className="container-page py-12">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={FolderTree} title="No categories yet" description="Learning paths will appear here once published." />
        ) : (
          <>
            {featured.length > 0 && (
              <div className="mb-12">
                <h2 className="mb-5 font-display text-xl font-semibold text-text">Featured paths</h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {featured.map((category) => (
                    <CategoryCard key={category.id} category={category} />
                  ))}
                </div>
              </div>
            )}
            <div>
              <h2 className="mb-5 font-display text-xl font-semibold text-text">All paths</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {rest.map((category) => (
                  <CategoryCard key={category.id} category={category} />
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
