import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Globe2,
  GraduationCap,
  Layers,
  Lock,
  PlayCircle,
  Users,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import type { Course, Enrollment, Progress } from '@/lib/types';
import { formatDate, formatDuration, formatNumber } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { SEO } from '@/components/seo/SEO';
import { Badge, DifficultyBadge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { GradientCover } from '@/components/ui/GradientCover';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { CourseCard } from '@/components/cards/CourseCard';

interface CourseResponse {
  course: Course;
  enrollment: Enrollment | null;
  progress: Progress | null;
}

interface RelatedResponse {
  courses: Course[];
}

export default function CourseDetail() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const { pick, t } = useLanguage();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [openLesson, setOpenLesson] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['course', slug],
    queryFn: async () => {
      const { data } = await api.get<CourseResponse>(`/courses/${slug}`);
      return data;
    },
    enabled: Boolean(slug),
  });

  const relatedCategorySlug = data?.course.category.slug;
  const { data: related } = useQuery({
    queryKey: ['course-related', relatedCategorySlug],
    queryFn: async () => {
      const response = await api.get<RelatedResponse>('/courses', {
        params: { category: relatedCategorySlug, limit: 3 },
      });
      return response.data;
    },
    enabled: Boolean(relatedCategorySlug),
  });

  const enroll = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error('Course not loaded');
      const response = await api.post(`/me/enroll/${data.course.id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('You are enrolled. Start learning!');
      void queryClient.invalidateQueries({ queryKey: ['course', slug] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/learn/${slug}`);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  if (isLoading) return <PageLoader label="Loading course…" />;
  if (isError || !data) {
    return (
      <div className="container-page py-20">
        <ErrorState title="Course not found" description="This course may have been removed or is not published yet." onRetry={() => refetch()} />
      </div>
    );
  }

  const { course, enrollment, progress } = data;
  const title = pick(course.title, course.titleTe);
  const description = pick(course.description, course.descriptionTe);
  const longDescription = pick(course.longDescription || '', course.longDescriptionTe);
  const objectives = pick(course.objectives.join('|'), course.objectivesTe.length ? course.objectivesTe.join('|') : null).split('|').filter(Boolean);
  const color = course.category?.color || '#8b5cf6';
  const totalMinutes = course.durationMinutes;

  const handleEnroll = () => {
    if (!user) {
      navigate('/login', { state: { from: `/courses/${slug}` } });
      return;
    }
    enroll.mutate();
  };

  const lessons = course.lessons || [];

  return (
    <>
      <SEO
        title={title}
        description={description}
        path={`/courses/${slug}`}
        type="course"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Course',
          name: course.title,
          description: course.description,
          provider: { '@type': 'Organization', name: 'TechTuxAcademy', sameAs: 'https://techtuxacademy.online' },
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR', availability: 'https://schema.org/InStock' },
        }}
      />

      <section className="border-b border-line/10 bg-surface/30">
        <div className="container-page py-10">
          <Link to="/courses" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-text">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to courses
          </Link>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_0.9fr] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/categories/${course.category.slug}`}>
                  <Badge tone="brand">{pick(course.category.name, course.category.nameTe)}</Badge>
                </Link>
                <DifficultyBadge difficulty={course.difficulty} />
                {course.featured && <Badge tone="amber">Featured</Badge>}
                {enrollment && <Badge tone="green">Enrolled</Badge>}
              </div>
              <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight text-text sm:text-4xl">
                {title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-muted">{description}</p>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> {formatNumber(course._count.enrollments)} learners
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <PlayCircle className="h-4 w-4" /> {course._count.lessons} lessons
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {formatDuration(totalMinutes)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe2 className="h-4 w-4" /> {course.language === 'te' ? 'Telugu' : 'English'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Award className="h-4 w-4" /> Certificate at {course.certificateThreshold}%
                </span>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-400/30 bg-brand-gradient font-semibold text-white">
                  {(course.instructor?.name || 'T').charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-text">{course.instructor?.name || 'TechTuxAcademy'}</p>
                  <p className="text-xs text-muted">Instructor</p>
                </div>
              </div>
            </div>

            <div className="card-surface overflow-hidden p-0 lg:sticky lg:top-24">
              <GradientCover
                seed={course.slug}
                label={course.category?.name}
                color={color}
                className="aspect-[16/10] w-full rounded-none border-0"
                icon={<GraduationCap className="h-5 w-5" />}
              />
              <div className="space-y-4 p-5">
                {progress && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted">
                      <span>Your progress</span>
                      <span className="text-brand-300">{progress.percent}%</span>
                    </div>
                    <ProgressBar value={progress.percent} />
                    <p className="mt-1.5 text-xs text-muted">
                      {progress.completedLessons} of {progress.totalLessons} lessons complete
                    </p>
                  </div>
                )}
                {enrollment ? (
                  <ButtonLink to={`/learn/${slug}`} className="w-full" size="lg">
                    <PlayCircle className="h-5 w-5" />
                    {progress && progress.percent > 0 ? 'Continue learning' : 'Start course'}
                  </ButtonLink>
                ) : (
                  <Button className="w-full" size="lg" onClick={handleEnroll} loading={enroll.isPending}>
                    <BookOpen className="h-5 w-5" />
                    Enroll now — free
                  </Button>
                )}
                <p className="text-center text-xs text-muted">Free access. Learn at your own pace.</p>

                <ul className="space-y-2.5 border-t border-line/10 pt-4 text-sm text-muted">
                  {[
                    `${course._count.lessons} structured video lessons`,
                    'Written notes and curated resources',
                    'Progress tracking and resume',
                    `Certificate at ${course.certificateThreshold}% completion`,
                    'English and Telugu summaries',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>

                {enrollment && (
                  <p className="text-center text-[11px] text-muted">
                    Enrolled {formatDate(enrollment.enrolledAt)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-10 py-12 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-10">
          <div>
            <h2 className="font-display text-2xl font-bold text-text">About this course</h2>
            <div className="prose-tech mt-4">
              <p>{longDescription || description}</p>
            </div>
          </div>

          {objectives.length > 0 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-text">What you will learn</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {objectives.map((objective) => (
                  <li key={objective} className="flex items-start gap-2.5 rounded-xl border border-line/10 bg-card p-3.5 text-sm leading-6 text-muted">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {objective}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {course.requirements.length > 0 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-text">Requirements</h2>
              <ul className="mt-3 space-y-2">
                {course.requirements.map((requirement) => (
                  <li key={requirement} className="flex items-start gap-2.5 text-sm leading-6 text-muted">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                    {requirement}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-display text-2xl font-bold text-text">Curriculum</h2>
              <p className="text-sm text-muted">
                {lessons.length} lessons · {formatDuration(totalMinutes)}
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line/10 bg-card">
              {lessons.length === 0 && (
                <p className="p-6 text-sm text-muted">Lessons for this course are being prepared.</p>
              )}
              {lessons.map((lesson, index) => {
                const isOpen = openLesson === lesson.id;
                return (
                  <div key={lesson.id} className="border-b border-line/10 last:border-0">
                    <button
                      onClick={() => setOpenLesson(isOpen ? null : lesson.id)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-line/5"
                      aria-expanded={isOpen}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line/10 bg-elevated text-xs font-semibold text-muted">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium text-text">{pick(lesson.title, lesson.titleTe)}</span>
                          {lesson.isPreview && <Badge tone="cyan">Preview</Badge>}
                          {lesson.locked && <Badge tone="neutral"><Lock className="h-2.5 w-2.5" /> Locked</Badge>}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">{formatDuration(lesson.durationMinutes)}</span>
                      </span>
                      {enrollment ? (
                        <Link
                          to={`/learn/${slug}?lesson=${lesson.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="hidden items-center gap-1 text-xs font-medium text-brand-300 hover:text-brand-200 sm:inline-flex"
                        >
                          <PlayCircle className="h-3.5 w-3.5" /> Watch
                        </Link>
                      ) : lesson.locked ? (
                        <Lock className="h-4 w-4 text-muted" />
                      ) : (
                        <PlayCircle className="h-4 w-4 text-brand-300" />
                      )}
                      <ChevronDown className={`h-4 w-4 text-muted transition ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="border-t border-line/10 bg-surface/40 px-4 py-4 pl-14">
                        <p className="text-sm leading-7 text-muted">
                          {pick(lesson.description || 'Lesson notes and resources are available in the learning player.', lesson.descriptionTe) || 'Lesson notes and resources are available in the learning player.'}
                        </p>
                        {lesson.resources && lesson.resources.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {lesson.resources.map((resource) => (
                              <li key={resource.url}>
                                <a
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-300 hover:text-brand-200"
                                >
                                  <FileText className="h-3.5 w-3.5" /> {resource.title}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                        {enrollment ? (
                          <ButtonLink to={`/learn/${slug}?lesson=${lesson.id}`} size="sm" className="mt-3">
                            <PlayCircle className="h-3.5 w-3.5" /> Watch lesson
                          </ButtonLink>
                        ) : (
                          <p className="mt-3 text-xs text-muted">
                            Enrol in the course to unlock this lesson and its resources.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {course.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Tags</span>
              {course.tags.map((tag) => (
                <Link key={tag} to={`/search?q=${encodeURIComponent(tag)}`}>
                  <Badge tone="neutral">#{tag}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card-surface p-5">
            <h3 className="font-display text-base font-semibold text-text">Course details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                { icon: Layers, label: 'Level', value: course.difficulty.charAt(0) + course.difficulty.slice(1).toLowerCase() },
                { icon: PlayCircle, label: 'Lessons', value: String(course._count.lessons) },
                { icon: Clock, label: 'Duration', value: formatDuration(course.durationMinutes) },
                { icon: Globe2, label: 'Language', value: course.language === 'te' ? 'Telugu' : 'English' },
                { icon: Users, label: 'Learners', value: formatNumber(course._count.enrollments) },
                { icon: Award, label: 'Certificate', value: `${course.certificateThreshold}% completion` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="inline-flex items-center gap-2 text-muted">
                    <Icon className="h-4 w-4" /> {label}
                  </dt>
                  <dd className="font-medium text-text">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl border border-brand-400/20 bg-brand-500/5 p-5 text-sm leading-7 text-muted">
            <p className="font-semibold text-text">Not sure where to start?</p>
            <p className="mt-1">
              Browse the{' '}
              <Link to="/categories" className="font-medium text-brand-300 hover:text-brand-200">
                learning paths
              </Link>{' '}
              or{' '}
              <Link to="/contact" className="font-medium text-brand-300 hover:text-brand-200">
                ask us
              </Link>
              . We will point you to the right course.
            </p>
          </div>
        </aside>
      </section>

      {related && related.courses.filter((item) => item.id !== course.id).length > 0 && (
        <section className="border-t border-line/10 bg-surface/30">
          <div className="container-page py-14">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-3">Keep going</p>
                <h2 className="font-display text-2xl font-bold text-text">More in {course.category.name}</h2>
              </div>
              <ButtonLink to={`/categories/${course.category.slug}`} variant="secondary" size="sm">
                View category <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.courses
                .filter((item) => item.id !== course.id)
                .slice(0, 3)
                .map((item) => (
                  <CourseCard key={item.id} course={item} />
                ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
