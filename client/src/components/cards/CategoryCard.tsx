import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { useLanguage } from '@/contexts/LanguageContext';

export function CategoryCard({ category, className }: { category: Category; className?: string }) {
  const { pick } = useLanguage();
  const counts = category._count;

  return (
    <Link
      to={`/categories/${category.slug}`}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-line/10 bg-card p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand-400/40 hover:shadow-glow',
        className
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
        style={{ backgroundColor: category.color }}
      />
      <div className="flex items-start justify-between">
        <CategoryIcon name={category.icon} color={category.color} className="h-11 w-11" />
        <ArrowUpRight className="h-4 w-4 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-300" />
      </div>
      <h3 className="mt-4 font-display text-base font-semibold text-text transition group-hover:text-brand-200">
        {pick(category.name, category.nameTe)}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">{category.description}</p>
      {counts && (
        <p className="mt-4 text-xs font-medium text-muted">
          {counts.courses} courses · {counts.tutorials} tutorials
        </p>
      )}
    </Link>
  );
}
