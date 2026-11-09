import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  GraduationCap,
  PlayCircle,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { DashboardData } from '@/lib/types';
import { formatDate, formatDuration, formatNumber } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEO } from '@/components/seo/SEO';
import { StatCard } from '@/components/ui/StatCard';
import { ButtonLink } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CardSkeleton, PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { CertificateCard } from '@/components/CertificateCard';

export default function Dashboard() {
  const { user } = useAuth();
  const { pick, t } = useLanguage();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get<DashboardData>('/me/dashboard');
      return data;
    },
  });

  if (isLoading) return <PageLoader label="Loading your dashboard…" />;
  if (isError || !data) return <ErrorState title="Could not load your dashboard" onRetry={() => refetch()} />;

  const firstName = (user?.name || data.user.name).split(' ')[0];

  return (
    <>
      <SEO title="Dashboard" noIndex />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-3">
            <Sparkles className="h-3.5 w-3.5" /> {t('dashboard.overview')}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text">
            {t('dashboard.welcome')}, {firstName}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {data.stats.enrolledCourses > 0
              ? 'Pick up where you left off, or start a new path today.'
              : 'Your learning journey starts with a single course.'}
          </p>
        </div>
        <ButtonLink to="/courses" variant="secondary" size="sm">
          <BookOpen className="h-4 w-4" /> Browse courses
        </ButtonLink>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dashboard.enrolled')} value={formatNumber(data.stats.enrolledCourses)} icon={BookOpen} tone="brand" />
        <StatCard label={t('dashboard.completed')} value={formatNumber(data.stats.completedCourses)} icon={CheckCircle2} tone="green" />
        <StatCard label={t('dashboard.certificates')} value={formatNumber(data.stats.certificates)} icon={Award} tone="amber" />
        <StatCard label={t('dashboard.minutes')} value={formatNumber(data.stats.minutesLearned)} icon={Clock} tone="cyan" hint={`${data.stats.lessonsCompleted} lessons completed`} />
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-text">{t('dashboard.continue')}</h2>
            <Link to="/dashboard/courses" className="text-xs font-medium text-brand-300 hover:text-brand-200">
              {t('common.viewAll')}
            </Link>
          </div>

          {data.continueLearning.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title={t('dashboard.noCourses')}
              description="Browse the catalogue and enrol in a course to start tracking your progress."
              action={<ButtonLink to="/courses">{t('dashboard.browse')}</ButtonLink>}
            />
          ) : (
            <div className="space-y-3">
              {data.continueLearning.map((item) => (
                <div key={item.enrollmentId} className="card-surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-brand-400/20 bg-brand-gradient/10">
                    <PlayCircle className="h-7 w-7 text-brand-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/learn/${item.course.slug}`}
                        className="font-display text-base font-semibold text-text transition hover:text-brand-200"
                      >
                        {pick(item.course.title, item.course.titleTe)}
                      </Link>
                      <Badge tone="brand">{item.course.difficulty.charAt(0) + item.course.difficulty.slice(1).toLowerCase()}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      Next: {item.nextLesson ? pick(item.nextLesson.title, item.nextLesson.titleTe) : 'Course complete'}
                    </p>
                    <div className="mt-2 max-w-md">
                      <ProgressBar value={item.progress.percent} size="sm" />
                      <p className="mt-1 text-[11px] text-muted">
                        {item.progress.completedLessons}/{item.progress.totalLessons} lessons · {item.progress.percent}%
                      </p>
                    </div>
                  </div>
                  <ButtonLink to={`/learn/${item.course.slug}`} size="sm" className="shrink-0">
                    {t('common.continue')}
                  </ButtonLink>
                </div>
              ))}
            </div>
          )}

          <div className="mt-10">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-text">{t('dashboard.recent')}</h2>
              <span className="text-xs text-muted">{data.recentLessons.length} recent</span>
            </div>
            {data.recentLessons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line/15 bg-surface/40 p-6 text-sm text-muted">
                Watch a lesson and it will appear here.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-line/10 bg-card">
                {data.recentLessons.map((row) => (
                  <Link
                    key={row.id}
                    to={`/learn/${row.lesson.course.slug}?lesson=${row.lessonId}`}
                    className="flex items-center gap-3 border-b border-line/10 px-4 py-3 transition last:border-0 hover:bg-line/5"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${row.completed ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-line/10 bg-elevated text-muted'}`}>
                      {row.completed ? <CheckCircle2 className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{pick(row.lesson.title, row.lesson.titleTe)}</p>
                      <p className="truncate text-xs text-muted">{row.lesson.course.title}</p>
                    </div>
                    <span className="hidden text-xs text-muted sm:block">{formatDate(row.lastWatchedAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="card-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-text">Certificates</h2>
              <Link to="/dashboard/certificates" className="text-xs font-medium text-brand-300 hover:text-brand-200">
                View all
              </Link>
            </div>
            {data.certificates.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-line/15 bg-surface/40 p-5 text-center">
                <Award className="mx-auto h-7 w-7 text-brand-300/70" />
                <p className="mt-2 text-sm font-medium text-text">No certificates yet</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Complete a course to earn a verifiable certificate.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {data.certificates.slice(0, 3).map((certificate) => (
                  <CertificateCard key={certificate.id} certificate={certificate} />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-brand-400/20 bg-brand-500/5 p-5">
            <div className="flex items-center gap-2 text-brand-300">
              <Flame className="h-5 w-5" />
              <p className="text-sm font-semibold">Keep the momentum</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              {data.stats.lessonsCompleted > 0
                ? `You have completed ${data.stats.lessonsCompleted} lessons and learned for ${formatDuration(data.stats.minutesLearned)}. One more lesson today keeps the habit strong.`
                : 'Small, regular sessions beat long cramming. Start with one lesson today.'}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted">
              <TrendingUp className="h-4 w-4 text-emerald-300" />
              Progress is saved automatically.
            </div>
          </div>

          <div className="card-surface p-5">
            <h2 className="font-display text-base font-semibold text-text">Account</h2>
            <p className="mt-1 truncate text-sm text-muted">{data.user.email}</p>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Badge tone={data.user.emailVerified ? 'green' : 'amber'}>
                {data.user.emailVerified ? 'Email verified' : 'Email unverified'}
              </Badge>
              <Badge tone="brand">{data.user.role.toLowerCase()}</Badge>
            </div>
            <div className="mt-4 flex gap-2">
              <ButtonLink to="/dashboard/profile" size="sm" variant="secondary">
                Profile
              </ButtonLink>
              {!data.user.emailVerified && (
                <ButtonLink to="/dashboard/profile" size="sm" variant="ghost">
                  Verify email
                </ButtonLink>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
