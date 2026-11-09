import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap } from 'lucide-react';
import { api } from '@/lib/api';
import type { Pagination } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { SEO } from '@/components/seo/SEO';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  AdminEmpty,
  AdminHeader,
  AdminPager,
  AdminSearch,
  TableWrap,
  Td,
  Th,
} from '@/components/admin/AdminUI';

interface EnrollmentRow {
  id: string;
  enrolledAt: string;
  lastAccessedAt: string;
  completedAt?: string | null;
  user: { id: string; name: string; email: string };
  course: { id: string; title: string; slug: string; _count: { lessons: number } };
}

interface EnrollmentsResponse {
  enrollments: EnrollmentRow[];
  pagination: Pagination;
}

export default function AdminEnrollments() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-enrollments', search, page],
    queryFn: async () => {
      const { data } = await api.get<EnrollmentsResponse>('/admin/enrollments', {
        params: { search, page, limit: 20 },
      });
      return data;
    },
  });

  return (
    <>
      <SEO title="Enrolments" noIndex />
      <AdminHeader
        title="Enrolments"
        description="Every course enrolment across the platform, newest first. Read-only view for support and reporting."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by learner, email or course…"
        />
      </div>

      {isLoading ? (
        <PageLoader label="Loading enrolments…" />
      ) : isError || !data ? (
        <ErrorState title="Could not load enrolments" onRetry={() => refetch()} />
      ) : data.enrollments.length === 0 ? (
        <AdminEmpty>
          <GraduationCap className="mx-auto mb-3 h-8 w-8 text-brand-300/70" />
          No enrolments match this view.
        </AdminEmpty>
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr>
                <Th>Learner</Th>
                <Th>Course</Th>
                <Th>Lessons</Th>
                <Th>Enrolled</Th>
                <Th>Last active</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {data.enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="transition hover:bg-line/5">
                  <Td>
                    <div className="min-w-[180px]">
                      <p className="font-medium text-text">{enrollment.user.name}</p>
                      <p className="text-xs text-muted">{enrollment.user.email}</p>
                    </div>
                  </Td>
                  <Td>
                    <Link
                      to={`/courses/${enrollment.course.slug}`}
                      className="font-medium text-text hover:text-brand-200"
                    >
                      {enrollment.course.title}
                    </Link>
                  </Td>
                  <Td className="text-xs">{enrollment.course._count.lessons}</Td>
                  <Td className="whitespace-nowrap text-xs">{formatDate(enrollment.enrolledAt)}</Td>
                  <Td className="whitespace-nowrap text-xs">{formatDate(enrollment.lastAccessedAt)}</Td>
                  <Td>
                    {enrollment.completedAt ? (
                      <Badge tone="green">Completed</Badge>
                    ) : (
                      <Badge tone="cyan">In progress</Badge>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <AdminPager pagination={data.pagination} onPageChange={setPage} />
        </>
      )}
    </>
  );
}
