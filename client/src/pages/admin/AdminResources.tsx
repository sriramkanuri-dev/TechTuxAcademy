import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  DatabaseZap,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Terminal,
  Trash2,
} from 'lucide-react';
import { api, apiErrorMessage, apiFileUrl } from '@/lib/api';
import type { GeneratedLessonResource } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { SEO } from '@/components/seo/SEO';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/Modal';
import { AdminEmpty, AdminHeader, AdminSection, TableWrap, Td, Th } from '@/components/admin/AdminUI';

interface ResourceStats {
  total: number;
  ready: number;
  outdated: number;
  failed: number;
  generating: number;
  queued: number;
}

interface ResourceJob {
  id: string;
  kind: 'lesson' | 'course' | 'all';
  targetLabel: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';
  total: number;
  completed: number;
  failed: number;
  resourcesGenerated: number;
  currentLesson: string | null;
  errors: { lessonId: string; lessonTitle: string; error: string }[];
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

interface CourseRow {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  published: boolean;
  lessons: number;
  ready: number;
  outdated: number;
  failed: number;
  missing: number;
  expected: number;
}

interface MissingRow {
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  missing: string[];
  outdated: string[];
  failed: string[];
}

interface Overview {
  autoGenerate: boolean;
  queue: {
    concurrency: number;
    active: number;
    queued: number;
    pendingLessons: number;
    jobs: ResourceJob[];
  };
  stats: ResourceStats;
  courses: CourseRow[];
  missing: MissingRow[];
  recentJobs: ResourceJob[];
}

interface CourseDetail {
  course: { id: string; title: string; slug: string };
  lessons: {
    id: string;
    title: string;
    order: number;
    resources: GeneratedLessonResource[];
  }[];
}

const TYPE_LABEL: Record<string, string> = {
  LESSON_NOTES: 'Lesson notes',
  COMMAND_CHEATSHEET: 'Command cheat sheet',
};

function statusTone(status: string): 'green' | 'amber' | 'rose' | 'neutral' | 'brand' {
  if (status === 'READY') return 'green';
  if (status === 'FAILED') return 'rose';
  if (status === 'GENERATING') return 'amber';
  if (status === 'QUEUED') return 'brand';
  return 'neutral';
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: 'green' | 'amber' | 'rose' | 'brand';
  hint?: string;
}) {
  const tones = {
    green: 'border-emerald-400/20 bg-emerald-500/5 text-emerald-200',
    amber: 'border-amber-400/20 bg-amber-500/5 text-amber-200',
    rose: 'border-rose-400/20 bg-rose-500/5 text-rose-200',
    brand: 'border-brand-400/20 bg-brand-500/5 text-brand-200',
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-text">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function JobProgress({ job }: { job: ResourceJob }) {
  const done = job.completed + job.failed;
  const percent = job.total ? Math.round((done / job.total) * 100) : 0;
  const running = job.status === 'RUNNING' || job.status === 'QUEUED';
  return (
    <div className="rounded-xl border border-line/10 bg-surface/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">
            {job.kind === 'all' ? 'All courses' : job.targetLabel}
          </p>
          <p className="text-[11px] text-muted">
            {job.currentLesson
              ? `Generating: ${job.currentLesson}`
              : running
                ? 'Waiting for the queue…'
                : `Finished ${job.finishedAt ? formatDate(job.finishedAt) : ''}`}
          </p>
        </div>
        <Badge tone={job.failed ? 'rose' : running ? 'brand' : 'green'}>
          {running && <Loader2 className="h-3 w-3 animate-spin" />}
          {job.status.replaceAll('_', ' ').toLowerCase()}
        </Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-line/10">
        <div
          className={`h-full rounded-full transition-all ${job.failed ? 'bg-rose-400' : 'bg-brand-400'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-muted">
        <span>
          {done} / {job.total} lessons · {job.resourcesGenerated} files generated
          {job.failed ? ` · ${job.failed} failed` : ''}
        </span>
        <span>{percent}%</span>
      </div>
      {job.errors.length > 0 && (
        <details className="mt-2 text-[11px] text-rose-200">
          <summary className="cursor-pointer font-medium">Show {job.errors.length} error(s)</summary>
          <ul className="mt-1 space-y-1">
            {job.errors.slice(0, 8).map((error, index) => (
              <li key={`${error.lessonId}-${index}`}>
                {error.lessonTitle}: {error.error}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function AdminResources() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<GeneratedLessonResource | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-resources'],
    queryFn: async () => {
      const { data } = await api.get<Overview>('/admin/resources/overview');
      return data;
    },
    refetchInterval: (query) => {
      const jobs = query.state.data?.queue?.jobs ?? [];
      return jobs.some((job) => job.status === 'RUNNING' || job.status === 'QUEUED') ? 2500 : false;
    },
  });

  const detailQuery = useQuery({
    queryKey: ['admin-resources-course', expandedId],
    queryFn: async () => {
      const { data } = await api.get<CourseDetail>(`/admin/resources/courses/${expandedId}`);
      return data;
    },
    enabled: Boolean(expandedId),
  });

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
    if (expandedId) {
      void queryClient.invalidateQueries({ queryKey: ['admin-resources-course', expandedId] });
    }
  };

  const generateAll = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ message: string }>('/admin/resources/generate-all', { force: false });
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      refreshAll();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const generateCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const { data } = await api.post<{ message: string }>(`/admin/resources/courses/${courseId}/generate`, {
        force: false,
      });
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      refreshAll();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const markCourseOutdated = useMutation({
    mutationFn: async (courseId: string) => {
      const { data } = await api.post<{ message: string }>(`/admin/resources/courses/${courseId}/outdated`);
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      refreshAll();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const generateLesson = useMutation({
    mutationFn: async (lessonId: string) => {
      const { data } = await api.post<{ message: string }>(`/admin/resources/lessons/${lessonId}/generate`, {
        force: true,
      });
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      refreshAll();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const removeResource = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ message: string }>(`/admin/resources/${id}`);
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      setPendingDelete(null);
      refreshAll();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const cleanup = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ message: string }>('/admin/resources/cleanup');
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      refreshAll();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  if (isLoading) return <PageLoader label="Loading learning resources…" />;
  if (isError || !data) return <ErrorState title="Could not load resources" onRetry={() => refetch()} />;

  const { stats, courses, missing, queue } = data;
  const jobs = queue.jobs.length ? queue.jobs : data.recentJobs;
  const expanded = courses.find((course) => course.courseId === expandedId);

  return (
    <>
      <SEO title="Learning resources" noIndex />
      <AdminHeader
        title="Learning resources"
        description="Generate, regenerate and monitor the per-lesson notes and command cheat sheet PDFs students download."
        action={
          <>
            <Button variant="secondary" size="sm" onClick={() => cleanup.mutate()} loading={cleanup.isPending}>
              <Trash2 className="h-4 w-4" /> Clean up missing files
            </Button>
            <Button size="sm" onClick={() => generateAll.mutate()} loading={generateAll.isPending}>
              <Sparkles className="h-4 w-4" /> Generate all lessons
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ready" value={stats.ready} tone="green" hint="Downloadable now" />
        <StatCard label="Outdated" value={stats.outdated} tone="amber" hint="Content changed since generation" />
        <StatCard label="Failed" value={stats.failed} tone="rose" hint="Needs regeneration" />
        <StatCard
          label="Missing"
          value={missing.reduce((total, row) => total + row.missing.length, 0)}
          tone="brand"
          hint="Lessons with no file yet"
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <AdminSection
          title="Background queue"
          description={`Concurrency ${queue.concurrency} · ${queue.active} running · ${queue.queued} queued`}
          className="lg:col-span-1"
        >
          <div className="space-y-2 text-sm text-muted">
            <p className="flex items-center justify-between">
              <span>Auto-generate new lessons</span>
              <Badge tone={data.autoGenerate ? 'green' : 'neutral'}>{data.autoGenerate ? 'On' : 'Off'}</Badge>
            </p>
            <p className="flex items-center justify-between">
              <span>Pending lessons</span>
              <span className="font-semibold text-text">{queue.pendingLessons}</span>
            </p>
            <p className="flex items-center justify-between">
              <span>Queued jobs</span>
              <span className="font-semibold text-text">{queue.jobs.length}</span>
            </p>
          </div>
        </AdminSection>

        <AdminSection
          title="Recent jobs"
          description="Bulk generation runs in the background so the API stays responsive."
          className="lg:col-span-2"
          action={
            <Button variant="ghost" size="sm" onClick={() => refetch()} loading={isFetching}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          }
        >
          {jobs.length === 0 ? (
            <p className="text-sm text-muted">No generation jobs yet. Use “Generate all lessons” to start one.</p>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 5).map((job) => (
                <JobProgress key={job.id} job={job} />
              ))}
            </div>
          )}
        </AdminSection>
      </div>

      <AdminSection
        title="Courses"
        description="Expand a course to generate individual lessons, preview PDFs or remove a file."
        className="mb-6"
      >
        {courses.length === 0 ? (
          <AdminEmpty>No courses yet. Create a course and add lessons first.</AdminEmpty>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Course</Th>
                <Th>Lessons</Th>
                <Th>Ready</Th>
                <Th>Outdated</Th>
                <Th>Failed</Th>
                <Th>Missing</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.courseId}>
                  <Td>
                    <button
                      onClick={() => setExpandedId(expandedId === course.courseId ? null : course.courseId)}
                      className="flex items-center gap-2 text-left font-medium text-text hover:text-brand-200"
                    >
                      {expandedId === course.courseId ? (
                        <ChevronDown className="h-4 w-4 text-brand-300" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate">{course.courseTitle}</span>
                        <span className="block text-[11px] text-muted">
                          {course.published ? 'Published' : 'Draft'} · {course.courseSlug}
                        </span>
                      </span>
                    </button>
                  </Td>
                  <Td>{course.lessons}</Td>
                  <Td>
                    <span className="font-semibold text-emerald-200">{course.ready}</span>
                    <span className="text-muted"> / {course.expected}</span>
                  </Td>
                  <Td>{course.outdated ? <Badge tone="amber">{course.outdated}</Badge> : '—'}</Td>
                  <Td>{course.failed ? <Badge tone="rose">{course.failed}</Badge> : '—'}</Td>
                  <Td>{course.missing ? <Badge tone="brand">{course.missing}</Badge> : '—'}</Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => generateCourse.mutate(course.courseId)}
                        loading={generateCourse.isPending && generateCourse.variables === course.courseId}
                      >
                        <DatabaseZap className="h-3.5 w-3.5" /> Generate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markCourseOutdated.mutate(course.courseId)}
                        loading={markCourseOutdated.isPending && markCourseOutdated.variables === course.courseId}
                        title="Mark every file in this course as outdated"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" /> Outdate
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </AdminSection>

      {expanded && (
        <AdminSection
          title={`Lessons · ${expanded.courseTitle}`}
          description="Per-lesson status. Regenerating a lesson overwrites both PDFs with the current lesson content."
          className="mb-6"
          action={
            <Button variant="ghost" size="sm" onClick={() => setExpandedId(null)}>
              Close
            </Button>
          }
        >
          {detailQuery.isLoading ? (
            <PageLoader label="Loading lessons…" />
          ) : detailQuery.isError || !detailQuery.data ? (
            <ErrorState title="Could not load lessons" onRetry={() => detailQuery.refetch()} />
          ) : (
            <div className="space-y-3">
              {detailQuery.data.lessons.map((lesson) => (
                <div key={lesson.id} className="rounded-xl border border-line/10 bg-surface/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text">
                        <span className="mr-2 text-muted">{String(lesson.order).padStart(2, '0')}</span>
                        {lesson.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {lesson.resources.length
                          ? `${lesson.resources.filter((r) => r.status === 'READY').length} ready · ${lesson.resources.length} total`
                          : 'No resources generated yet'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => generateLesson.mutate(lesson.id)}
                      loading={generateLesson.isPending && generateLesson.variables === lesson.id}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Generate
                    </Button>
                  </div>

                  {lesson.resources.length > 0 && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {lesson.resources.map((resource) => (
                        <div
                          key={resource.id}
                          className="rounded-lg border border-line/10 bg-card p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-start gap-2">
                              <span className="mt-0.5 text-brand-300">
                                {resource.resourceType === 'COMMAND_CHEATSHEET' ? (
                                  <Terminal className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-text">
                                  {TYPE_LABEL[resource.resourceType] || resource.resourceType}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted">
                                  v{resource.version}
                                  {resource.generatedAt ? ` · ${formatDate(resource.generatedAt)}` : ''}
                                  {resource.fileSize ? ` · ${Math.max(1, Math.round(resource.fileSize / 1024))} KB` : ''}
                                </p>
                              </div>
                            </div>
                            <Badge tone={statusTone(resource.status)}>{resource.status.toLowerCase()}</Badge>
                          </div>
                          {resource.outdated && (
                            <p className="mt-1 text-[11px] font-medium text-amber-300">
                              Outdated — content changed since this file was generated.
                            </p>
                          )}
                          {resource.error && (
                            <p className="mt-1 line-clamp-2 text-[11px] text-rose-300">{resource.error}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {resource.status === 'READY' && (
                              <>
                                <a
                                  href={apiFileUrl(resource.previewUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-300 hover:text-brand-200"
                                >
                                  <ExternalLink className="h-3 w-3" /> Preview
                                </a>
                                <a
                                  href={apiFileUrl(resource.downloadUrl)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-300 hover:text-brand-200"
                                >
                                  <Download className="h-3 w-3" /> Download
                                </a>
                              </>
                            )}
                            <button
                              onClick={() => setPendingDelete(resource)}
                              className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300 hover:text-rose-200"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </AdminSection>
      )}

      <AdminSection
        title="Missing or stale resources"
        description="Lessons whose PDFs have never been generated, failed, or need regeneration after a content change."
      >
        {missing.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> Every lesson has an up-to-date resource.
          </p>
        ) : (
          <div className="space-y-2">
            {missing.slice(0, 40).map((row) => (
              <div
                key={row.lessonId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/10 bg-surface/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{row.lessonTitle}</p>
                  <p className="text-[11px] text-muted">{row.courseTitle}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {row.missing.map((type) => (
                      <Badge key={`m-${type}`} tone="brand">
                        missing {TYPE_LABEL[type] || type}
                      </Badge>
                    ))}
                    {row.outdated.map((type) => (
                      <Badge key={`o-${type}`} tone="amber">
                        outdated {TYPE_LABEL[type] || type}
                      </Badge>
                    ))}
                    {row.failed.map((type) => (
                      <Badge key={`f-${type}`} tone="rose">
                        failed {TYPE_LABEL[type] || type}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => generateLesson.mutate(row.lessonId)}
                  loading={generateLesson.isPending && generateLesson.variables === row.lessonId}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Generate now
                </Button>
              </div>
            ))}
            {missing.length > 40 && (
              <p className="text-xs text-muted">Showing the first 40 of {missing.length} lessons.</p>
            )}
          </div>
        )}
      </AdminSection>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removeResource.mutate(pendingDelete.id)}
        title="Delete this resource?"
        description="The PDF file and its database record are removed. Students lose access until it is generated again."
        confirmLabel="Delete resource"
        loading={removeResource.isPending}
      />
    </>
  );
}
