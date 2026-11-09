import { Link } from 'react-router-dom';
import { Clock, PlayCircle, Users } from 'lucide-react';
import type { Course } from '@/lib/types';
import { assetUrl } from '@/lib/api';
import { cn, difficultyLabel, formatDuration } from '@/lib/utils';
import { DifficultyBadge } from '@/components/ui/Badge';
import { GradientCover } from '@/components/ui/GradientCover';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useLanguage } from '@/contexts/LanguageContext';

export function CourseCard({
  course,
  progressPercent,
  className,
}: {
  course: Course;
  progressPercent?: number;
  className?: string;
}) {
  const { pick } = useLanguage();
  const title = pick(course.title, course.titleTe);
  const color = course.category?.color || '#8b5cf6';

  return (
    <Link
      to={`/courses/${course.slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-line/10 bg-card shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand-400/40 hover:shadow-glow',
        className
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        {course.thumbnail ? (
          <img
            src={assetUrl(course.thumbnail)}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <GradientCover
            seed={course.slug}
            label={course.category?.name}
            color={color}
            className="h-full w-full rounded-none border-0"
          />
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <DifficultyBadge difficulty={course.difficulty} />
          {course.featured && (
            <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
              Featured
            </span>
          )}
        </div>
        {typeof progressPercent === 'number' && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6">
            <ProgressBar value={progressPercent} size="sm" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
          {course.category && (
            <span className="inline-flex items-center gap-1.5" style={{ color }}>
              <CategoryIcon name={course.category.icon} className="h-5 w-5 border-0 bg-transparent p-0" color={color} />
              {course.category.name}
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-text transition group-hover:text-brand-200">
          {title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">
          {pick(course.description, course.descriptionTe)}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <PlayCircle className="h-3.5 w-3.5" />
            {course._count?.lessons ?? course.lessons?.length ?? 0} lessons
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(course.durationMinutes)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {course._count?.enrollments ?? 0}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-line/10 pt-3">
          <span className="text-xs text-muted">By {course.instructor?.name || 'TechTuxAcademy'}</span>
          <span className="text-xs font-semibold text-brand-300">{difficultyLabel(course.difficulty)}</span>
        </div>
      </div>
    </Link>
  );
}
