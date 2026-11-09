import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  Lock,
  Menu,
  PlayCircle,
  Sparkles,
  X,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import type { Course, Enrollment, Lesson, Progress } from '@/lib/types';
import { cn, formatDuration } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { SEO } from '@/components/seo/SEO';
import { Badge, DifficultyBadge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { Logo } from '@/components/ui/Logo';

interface LearnResponse {
  course: Course & { lessons: Lesson[] };
  enrollment: Enrollment | null;
  progress: Progress | null;
  lastLessonId: string | null;
  enrollmentRequired: boolean;
}

interface CompleteResponse {
  progress: Progress;
  courseCompleted: boolean;
  certificate: { certificateId: string; id: string } | null;
  message: string;
}

export default function Learn() {
  const { slug = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { pick } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const watchedRef = useRef<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['learn', slug],
    queryFn: async () => {
      const { data } = await api.get<LearnResponse>(`/me/courses/${slug}`);
      return data;
    },
    enabled: Boolean(slug),
  });

  const lessons = data?.course.lessons || [];
  const requestedId = params.get('lesson');

  const activeLesson = useMemo(() => {
    if (lessons.length === 0) return null;
    return (
      lessons.find((lesson) => lesson.id === requestedId) ||
      lessons.find((lesson) => lesson.id === data?.lastLessonId) ||
      lessons[0]
    );
  }, [lessons, requestedId, data?.lastLessonId]);

  const activeIndex = activeLesson ? lessons.findIndex((lesson) => lesson.id === activeLesson.id) : -1;
  const completedIds = useMemo(() => new Set(data?.progress?.completedLessonIds || []), [data?.progress]);

  const selectLesson = (lesson: Lesson) => {
    const next = new URLSearchParams(params);
    next.set('lesson', lesson.id);
    setParams(next, { replace: true });
    setSidebarOpen(false);
  };

  const watch = useMutation({
    mutationFn: async (lessonId: string) => {
      await api.post(`/me/lessons/${lessonId}/watch`, {});
    },
  });

  const complete = useMutation({
    mutationFn: async ({ lessonId, completed }: { lessonId: string; completed: boolean }) => {
      const { data } = await api.post<CompleteResponse>(`/me/lessons/${lessonId}/complete`, { completed });
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: ['learn', slug] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['my-certificates'] });
      if (result.certificate) {
        toast.success(`Certificate issued: ${result.certificate.certificateId}`);
      }
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const enroll = useMutation({
    mutationFn: async (courseId: string) => {
      const { data } = await api.post(`/me/enroll/${courseId}`);
      return data;
    },
    onSuccess: () => {
      toast.success('You are enrolled. Start learning!');
      void queryClient.invalidateQueries({ queryKey: ['learn', slug] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  // Record a watch event once per selected lesson per visit.
  useEffect(() => {
    if (!activeLesson || !data?.enrollment) return;
    if (watchedRef.current === activeLesson.id) return;
    watchedRef.current = activeLesson.id;
    watch.mutate(activeLesson.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson?.id, data?.enrollment]);

  if (isLoading) return <PageLoader label="Loading your lesson…" />;

  if (isError || !data) {
    return (
      <div className="container-page py-20">
        <ErrorState
          title="Course not available"
          description="This course may have been unpublished, or your session has expired."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const { course, enrollment, progress } = data;
  const title = pick(course.title, course.titleTe);
  const threshold = course.certificateThreshold;
  const percent = progress?.percent || 0;
  const canClaim = enrollment && percent >= threshold;

  return (
    <div className="min-h-screen bg-bg">
      <SEO title={`Learn: ${title}`} path={`/learn/${slug}`} noIndex />

      <header className="sticky top-0 z-40 border-b border-line/10 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="hidden sm:block">
            <Logo size="sm" />
          </Link>
          <span className="hidden h-6 w-px bg-line/15 sm:block" />
          <Link
            to={`/courses/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Course page
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text">{title}</p>
            <p className="truncate text-[11px] text-muted">
              {progress ? `${progress.completedLessons} of ${progress.totalLessons} lessons complete` : 'Not enrolled'}
            </p>
          </div>
          <div className="hidden w-40 lg:block">
            <ProgressBar value={percent} size="sm" />
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open lesson list"
          >
            <Menu className="h-4 w-4" /> Lessons
          </Button>
        </div>
      </header>

      {!enrollment ? (
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <div className="card-surface overflow-hidden p-0">
            <div className="border-b border-line/10 bg-brand-500/5 p-8 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-400/30 bg-brand-500/10">
                <Lock className="h-6 w-6 text-brand-300" />
              </span>
              <h1 className="mt-5 font-display text-2xl font-bold text-text">Enrol to start this course</h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">
                {title} is free to learn. Enrol to unlock all {lessons.length} lessons, track your progress and
                earn a certificate at {threshold}% completion.
              </p>
            </div>
            <div className="space-y-4 p-8">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <DifficultyBadge difficulty={course.difficulty} />
                <Badge tone="brand">{pick(course.category.name, course.category.nameTe)}</Badge>
                <Badge tone="neutral">{lessons.length} lessons</Badge>
                <Badge tone="neutral">{formatDuration(course.durationMinutes)}</Badge>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button size="lg" loading={enroll.isPending} onClick={() => enroll.mutate(course.id)}>
                  <GraduationCap className="h-5 w-5" /> Enrol now — free
                </Button>
                <ButtonLink to={`/courses/${slug}`} size="lg" variant="secondary">
                  Back to course
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1600px] gap-0 lg:grid-cols-[minmax(0,1fr)_380px]">
          <main className="min-w-0 px-4 py-6 sm:px-6 lg:py-8">
            {canClaim && (
              <div className="mb-5 flex flex-col items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 sm:flex-row sm:items-center">
                <Award className="h-6 w-6 shrink-0 text-emerald-300" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text">You have met the certificate threshold.</p>
                  <p className="text-xs text-muted">
                    Your certificate is available in the certificate dashboard.
                  </p>
                </div>
                <ButtonLink to="/dashboard/certificates" size="sm">
                  View certificate <ArrowRight className="h-3.5 w-3.5" />
                </ButtonLink>
              </div>
            )}

            {activeLesson ? (
              <>
                <div className="overflow-hidden rounded-2xl border border-line/10 bg-black shadow-card">
                  <div className="relative aspect-video w-full">
                    <iframe
                      key={activeLesson.id}
                      src={`https://www.youtube-nocookie.com/embed/${activeLesson.youtubeId}?rel=0&modestbranding=1`}
                      title={pick(activeLesson.title, activeLesson.titleTe)}
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-brand-300">
                        Lesson {activeIndex + 1} of {lessons.length}
                      </span>
                      {completedIds.has(activeLesson.id) && (
                        <Badge tone="green">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Completed
                        </Badge>
                      )}
                      {activeLesson.isPreview && <Badge tone="cyan">Preview</Badge>}
                    </div>
                    <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text">
                      {pick(activeLesson.title, activeLesson.titleTe)}
                    </h1>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted">
                      <Clock className="h-4 w-4" /> {formatDuration(activeLesson.durationMinutes)}
                    </p>
                  </div>

                  <Button
                    variant={completedIds.has(activeLesson.id) ? 'secondary' : 'primary'}
                    loading={complete.isPending}
                    onClick={() =>
                      complete.mutate({
                        lessonId: activeLesson.id,
                        completed: !completedIds.has(activeLesson.id),
                      })
                    }
                    className="shrink-0"
                  >
                    {completedIds.has(activeLesson.id) ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Mark incomplete
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Mark complete
                      </>
                    )}
                  </Button>
                </div>

                {pick(activeLesson.description || '', activeLesson.descriptionTe) && (
                  <div className="prose-tech mt-6 rounded-2xl border border-line/10 bg-card p-5 text-sm">
                    <p>{pick(activeLesson.description || '', activeLesson.descriptionTe)}</p>
                  </div>
                )}

                {activeLesson.resources && activeLesson.resources.length > 0 && (
                  <div className="mt-6 rounded-2xl border border-line/10 bg-card p-5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                      <FileText className="h-4 w-4 text-brand-300" /> Lesson resources
                    </h2>
                    <ul className="mt-3 space-y-2">
                      {activeLesson.resources.map((resource) => (
                        <li key={`${resource.title}-${resource.url}`}>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-brand-300 transition hover:text-brand-200"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> {resource.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-line/10 pt-5">
                  <Button
                    variant="secondary"
                    disabled={activeIndex <= 0}
                    onClick={() => selectLesson(lessons[activeIndex - 1])}
                  >
                    <ArrowLeft className="h-4 w-4" /> Previous
                  </Button>
                  <Button
                    disabled={activeIndex < 0 || activeIndex >= lessons.length - 1}
                    onClick={() => selectLesson(lessons[activeIndex + 1])}
                  >
                    Next lesson <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-line/15 bg-surface/40 p-12 text-center">
                <PlayCircle className="mx-auto h-10 w-10 text-brand-300/70" />
                <h2 className="mt-4 font-display text-lg font-semibold text-text">Lessons are being prepared</h2>
                <p className="mt-1 text-sm text-muted">This course does not have any lessons yet.</p>
              </div>
            )}
          </main>

          <aside
            className={cn(
              'fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-sm flex-col border-l border-line/10 bg-surface/95 backdrop-blur-xl transition-transform lg:sticky lg:top-16 lg:z-0 lg:h-[calc(100vh-4rem)] lg:w-auto lg:max-w-none lg:translate-x-0',
              sidebarOpen ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            <div className="flex items-center justify-between border-b border-line/10 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-text">Course content</p>
                <p className="text-[11px] text-muted">
                  {progress?.completedLessons || 0}/{progress?.totalLessons || lessons.length} complete
                </p>
              </div>
              <button
                className="rounded-lg p-1.5 text-muted hover:bg-line/10 hover:text-text lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close lesson list"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-line/10 px-4 py-3">
              <ProgressBar value={percent} size="sm" />
              <p className="mt-1.5 text-[11px] text-muted">
                {canClaim ? (
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <Sparkles className="h-3 w-3" /> Certificate unlocked
                  </span>
                ) : (
                  `Certificate at ${threshold}% completion`
                )}
              </p>
            </div>

            <ol className="flex-1 overflow-y-auto p-2">
              {lessons.map((lesson, index) => {
                const active = lesson.id === activeLesson?.id;
                const done = completedIds.has(lesson.id);
                return (
                  <li key={lesson.id}>
                    <button
                      onClick={() => selectLesson(lesson)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition',
                        active ? 'bg-brand-500/12' : 'hover:bg-line/5'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                          done
                            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                            : active
                              ? 'border-brand-400/50 bg-brand-500/20 text-brand-200'
                              : 'border-line/15 bg-elevated text-muted'
                        )}
                      >
                        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : active ? <PlayCircle className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-sm font-medium', active ? 'text-brand-200' : 'text-text')}>
                          {pick(lesson.title, lesson.titleTe)}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                          <Clock className="h-3 w-3" /> {formatDuration(lesson.durationMinutes)}
                          {lesson.isPreview && <span className="text-cyan-300">Preview</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="border-t border-line/10 p-3">
              <ButtonLink to={`/courses/${slug}`} variant="secondary" size="sm" className="w-full">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to course details
              </ButtonLink>
            </div>
          </aside>

          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
        </div>
      )}
    </div>
  );
}
