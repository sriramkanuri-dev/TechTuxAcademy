import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Award,
  BarChart3,
  BookOpen,
  GraduationCap,
  Mail,
  MessageSquare,
  Newspaper,
  ScrollText,
  Users,
  Video,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AdminStats, Certificate } from '@/lib/types';
import { formatNumber } from '@/lib/utils';
import { SEO } from '@/components/seo/SEO';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { AdminEmpty, AdminHeader, AdminSection } from '@/components/admin/AdminUI';

interface AnalyticsResponse {
  stats: AdminStats;
  recentRegistrations: { id: string; name: string; role: string }[];
  recentEnrollments: { id: string; enrolledAt: string }[];
  recentCertificates: Certificate[];
  topCourses: {
    id: string;
    title: string;
    slug: string;
    published: boolean;
    _count: { enrollments: number; lessons: number };
    category: { name: string; color: string } | null;
  }[];
  recentMessages: { id: string; handled: boolean }[];
}

function percent(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

export default function AdminAnalytics() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await api.get<AnalyticsResponse>('/admin/stats');
      return data;
    },
  });

  if (isLoading) return <PageLoader label="Loading analytics…" />;
  if (isError || !data) return <ErrorState title="Could not load analytics" onRetry={() => refetch()} />;

  const { stats } = data;
  const certificateRate = percent(stats.certificates, stats.enrollments);
  const coursePublishRate = percent(stats.publishedCourses, stats.totalCourses);
  const tutorialPublishRate = percent(stats.publishedTutorials, stats.totalTutorials);
  const postPublishRate = percent(stats.publishedPosts, stats.totalPosts);
  const lessonsPerCourse = stats.totalCourses ? (stats.totalLessons / stats.totalCourses).toFixed(1) : '0';
  const enrollmentsPerCourse = stats.totalCourses ? (stats.enrollments / stats.totalCourses).toFixed(1) : '0';
  const maxEnrollments = Math.max(1, ...data.topCourses.map((course) => course._count.enrollments));

  const contentRows = [
    { label: 'Courses', published: stats.publishedCourses, total: stats.totalCourses, icon: BookOpen },
    { label: 'Tutorials', published: stats.publishedTutorials, total: stats.totalTutorials, icon: ScrollText },
    { label: 'Articles', published: stats.publishedPosts, total: stats.totalPosts, icon: Newspaper },
  ];

  const funnel = [
    { label: 'Enrolments', value: stats.enrollments, tone: 'bg-brand-500' },
    { label: 'Certificates issued', value: stats.certificates, tone: 'bg-emerald-500' },
  ];

  return (
    <>
      <SEO title="Analytics" noIndex />
      <AdminHeader
        title="Analytics"
        description="Every figure is computed live from the database. Rates compare published content and completed certificates."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Certificate conversion"
          value={`${certificateRate}%`}
          icon={Award}
          tone="green"
          hint={`${formatNumber(stats.certificates)} certificates / ${formatNumber(stats.enrollments)} enrolments`}
        />
        <StatCard
          label="Course publish rate"
          value={`${coursePublishRate}%`}
          icon={BookOpen}
          tone="brand"
          hint={`${formatNumber(stats.publishedCourses)} of ${formatNumber(stats.totalCourses)} courses live`}
        />
        <StatCard
          label="Lessons per course"
          value={lessonsPerCourse}
          icon={Video}
          tone="cyan"
          hint={`${formatNumber(stats.totalLessons)} lessons in total`}
        />
        <StatCard
          label="Enrolments per course"
          value={enrollmentsPerCourse}
          icon={GraduationCap}
          tone="blue"
          hint={`${formatNumber(stats.enrollments)} enrolments across all courses`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <AdminSection title="Top courses by enrolment" description="The most popular courses on the platform.">
          {data.topCourses.length === 0 ? (
            <AdminEmpty>No course data yet.</AdminEmpty>
          ) : (
            <ul className="space-y-4">
              {data.topCourses.map((course, index) => (
                <li key={course.id}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-5 shrink-0 text-xs font-semibold text-muted">{index + 1}.</span>
                      <Link
                        to={`/admin/courses/${course.id}`}
                        className="min-w-0 truncate text-sm font-medium text-text hover:text-brand-200"
                      >
                        {course.title}
                      </Link>
                      {!course.published && <Badge tone="amber">Draft</Badge>}
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-text">
                      {formatNumber(course._count.enrollments)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line/10">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(2, Math.round((course._count.enrollments / maxEnrollments) * 100))}%`,
                        backgroundColor: course.category?.color || '#8b5cf6',
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    {course.category?.name || 'Uncategorised'} · {course._count.lessons} lessons
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <div className="space-y-6">
          <AdminSection title="Learning funnel" description="Enrolments converting into certificates.">
            {funnel.map((row) => (
              <div key={row.label} className="mb-4 last:mb-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">{row.label}</span>
                  <span className="font-semibold text-text">{formatNumber(row.value)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line/10">
                  <div
                    className={`h-full rounded-full ${row.tone}`}
                    style={{
                      width: `${Math.max(2, Math.round((row.value / Math.max(1, stats.enrollments)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            <p className="mt-2 rounded-xl border border-line/10 bg-surface/40 px-3 py-2 text-xs leading-6 text-muted">
              {certificateRate}% of enrolments have produced a certificate. Certificates are issued automatically once
              a learner reaches each course's threshold.
            </p>
          </AdminSection>

          <AdminSection title="Audience" description="Registered accounts by role.">
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-muted">
                  <Users className="h-4 w-4 text-brand-300" /> Students
                </span>
                <span className="font-semibold text-text">{formatNumber(stats.students)}</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-muted">
                  <GraduationCap className="h-4 w-4 text-cyan-300" /> Instructors
                </span>
                <span className="font-semibold text-text">{formatNumber(stats.instructors)}</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-muted">
                  <Mail className="h-4 w-4 text-emerald-300" /> Newsletter
                </span>
                <span className="font-semibold text-text">{formatNumber(stats.newsletterSubscribers)}</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-muted">
                  <MessageSquare className="h-4 w-4 text-amber-300" /> Open messages
                </span>
                <span className="font-semibold text-text">{formatNumber(stats.unhandledMessages)}</span>
              </li>
            </ul>
          </AdminSection>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminSection title="Content pipeline" description="Published versus total for each content type.">
          <ul className="space-y-4">
            {contentRows.map((row) => {
              const rate = percent(row.published, row.total);
              return (
                <li key={row.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 text-muted">
                      <row.icon className="h-4 w-4 text-brand-300" /> {row.label}
                    </span>
                    <span className="font-semibold text-text">
                      {formatNumber(row.published)} / {formatNumber(row.total)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line/10">
                    <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.max(2, rate)}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted">{rate}% published</p>
                </li>
              );
            })}
            <li className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-muted">
                <ScrollText className="h-4 w-4 text-cyan-300" /> Tutorial publish rate
              </span>
              <span className="font-semibold text-text">{tutorialPublishRate}%</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-muted">
                <Newspaper className="h-4 w-4 text-emerald-300" /> Article publish rate
              </span>
              <span className="font-semibold text-text">{postPublishRate}%</span>
            </li>
          </ul>
        </AdminSection>

        <AdminSection title="Recent activity" description="Newest enrolments and certificates in the dataset.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Enrolments</p>
              <p className="mt-1 font-display text-3xl font-bold text-text">
                {formatNumber(data.recentEnrollments.length)}
              </p>
              <p className="mt-1 text-xs text-muted">recent records sampled</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Certificates</p>
              <p className="mt-1 font-display text-3xl font-bold text-text">
                {formatNumber(data.recentCertificates.length)}
              </p>
              <p className="mt-1 text-xs text-muted">recent records sampled</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-brand-400/20 bg-brand-500/5 p-4 text-xs leading-6 text-muted">
            <p className="flex items-center gap-1.5 font-semibold text-text">
              <BarChart3 className="h-3.5 w-3.5 text-brand-300" /> How to read this page
            </p>
            <p className="mt-1">
              Rates are ratios of live counts returned by <code className="font-mono">/api/admin/stats</code>. They are
              not cached or hardcoded. "Recent records sampled" refers to the small recent-activity list included with
              the stats response, not the full table totals shown above.
            </p>
          </div>
        </AdminSection>
      </div>
    </>
  );
}
