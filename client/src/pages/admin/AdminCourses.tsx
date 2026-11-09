import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Edit3, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import type { Course, Pagination } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { SEO } from '@/components/seo/SEO';
import { Badge, DifficultyBadge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/Modal';
import { AdminEmpty, AdminHeader, AdminPager, AdminSearch, TableWrap, Td, Th } from '@/components/admin/AdminUI';

interface CoursesResponse {
  courses: (Course & { _count: { lessons: number; enrollments: number; certificates: number } })[];
  pagination: Pagination;
}

export default function AdminCourses() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Course | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-courses', search, status, page],
    queryFn: async () => {
      const { data } = await api.get<CoursesResponse>('/courses/admin/all', {
        params: { search, status, page, limit: 12 },
      });
      return data;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { data } = await api.patch<{ message: string }>(`/courses/admin/${id}/status`, { published });
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['site-home'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ message: string }>(`/courses/admin/${id}`);
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <>
      <SEO title="Manage courses" noIndex />
      <AdminHeader
        title="Courses"
        description="Create courses, manage lessons and control what is published on the public catalogue."
        action={
          <ButtonLink to="/admin/courses/new" size="sm">
            <Plus className="h-4 w-4" /> New course
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <AdminSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search by title or slug…" />
        <select
          value={status}
          onChange={(event) => { setStatus(event.target.value); setPage(1); }}
          aria-label="Filter by status"
          className="input-base w-full cursor-pointer sm:w-48"
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </div>

      {isLoading ? (
        <PageLoader label="Loading courses…" />
      ) : isError || !data ? (
        <ErrorState title="Could not load courses" onRetry={() => refetch()} />
      ) : data.courses.length === 0 ? (
        <AdminEmpty>
          <BookOpen className="mx-auto mb-3 h-8 w-8 text-brand-300/70" />
          No courses match this view.{' '}
          <Link to="/admin/courses/new" className="font-medium text-brand-300 hover:text-brand-200">
            Create the first course
          </Link>
          .
        </AdminEmpty>
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr>
                <Th>Course</Th>
                <Th>Category</Th>
                <Th>Lessons</Th>
                <Th>Learners</Th>
                <Th>Status</Th>
                <Th>Updated</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {data.courses.map((course) => (
                <tr key={course.id} className="transition hover:bg-line/5">
                  <Td>
                    <div className="min-w-[220px]">
                      <Link to={`/admin/courses/${course.id}`} className="font-medium text-text hover:text-brand-200">
                        {course.title}
                      </Link>
                      <p className="mt-0.5 font-mono text-[11px] text-muted">/{course.slug}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <DifficultyBadge difficulty={course.difficulty} />
                        {course.featured && <Badge tone="amber">Featured</Badge>}
                      </div>
                    </div>
                  </Td>
                  <Td>{course.category?.name || '—'}</Td>
                  <Td>{course._count.lessons}</Td>
                  <Td>{course._count.enrollments}</Td>
                  <Td>
                    <Badge tone={course.published ? 'green' : 'amber'}>{course.published ? 'Published' : 'Draft'}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-xs">{formatDate(course.updatedAt || course.createdAt)}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <ButtonLink to={`/admin/courses/${course.id}`} size="icon" variant="ghost" aria-label="Edit course">
                        <Edit3 className="h-4 w-4" />
                      </ButtonLink>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={course.published ? 'Unpublish course' : 'Publish course'}
                        loading={toggleStatus.isPending && toggleStatus.variables?.id === course.id}
                        onClick={() => toggleStatus.mutate({ id: course.id, published: !course.published })}
                      >
                        {course.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-rose-300 hover:bg-rose-500/10"
                        aria-label="Delete course"
                        onClick={() => setPendingDelete(course)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <AdminPager pagination={data.pagination} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        title="Delete this course?"
        description={`“${pendingDelete?.title || ''}” and all of its lessons will be permanently deleted. Learner progress and certificates linked to it will also be removed.`}
        confirmLabel="Delete course"
        loading={remove.isPending}
      />
    </>
  );
}
