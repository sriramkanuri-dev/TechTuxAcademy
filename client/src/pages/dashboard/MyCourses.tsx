import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, GraduationCap } from 'lucide-react';
import { api } from '@/lib/api';
import type { Enrollment } from '@/lib/types';
import { SEO } from '@/components/seo/SEO';
import { CourseCard } from '@/components/cards/CourseCard';
import { Tabs } from '@/components/ui/Tabs';
import { CardSkeleton, PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';

interface EnrollmentsResponse {
  enrollments: Enrollment[];
}

export default function MyCourses() {
  const [tab, setTab] = useState('all');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      const { data } = await api.get<EnrollmentsResponse>('/me/enrollments');
      return data.enrollments;
    },
  });

  if (isLoading) return <PageLoader label="Loading your courses…" />;
  if (isError || !data) return <ErrorState title="Could not load your courses" onRetry={() => refetch()} />;

  const inProgress = data.filter((item) => (item.progress?.percent || 0) > 0 && (item.progress?.percent || 0) < 100);
  const completed = data.filter((item) => (item.progress?.percent || 0) >= 100);
  const notStarted = data.filter((item) => (item.progress?.percent || 0) === 0);

  const filtered =
    tab === 'progress' ? inProgress : tab === 'completed' ? completed : tab === 'new' ? notStarted : data;

  return (
    <>
      <SEO title="My courses" noIndex />
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">My courses</h1>
        <p className="mt-1 text-sm text-muted">
          {data.length} enrolled course{data.length === 1 ? '' : 's'} · your progress is saved automatically.
        </p>
      </div>

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'all', label: 'All', count: data.length },
          { id: 'progress', label: 'In progress', count: inProgress.length },
          { id: 'new', label: 'Not started', count: notStarted.length },
          { id: 'completed', label: 'Completed', count: completed.length },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={data.length === 0 ? 'You have not enrolled in a course yet' : 'Nothing in this view'}
          description={
            data.length === 0
              ? 'Browse the catalogue and pick a path that matches what you want to build.'
              : 'Switch tabs to see your other courses, or continue learning.'
          }
          action={
            <ButtonLink to="/courses">
              <BookOpen className="h-4 w-4" /> Browse courses
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((enrollment) =>
            enrollment.course ? (
              <CourseCard
                key={enrollment.id}
                course={enrollment.course}
                progressPercent={enrollment.progress?.percent}
              />
            ) : null
          )}
        </div>
      )}
    </>
  );
}
