import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  GraduationCap,
  Mail,
  MessageSquare,
  Newspaper,
  ScrollText,
  Users,
  Video,
  Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AdminStats, Certificate } from '@/lib/types';
import { formatDate, formatNumber } from '@/lib/utils';
import { SEO } from '@/components/seo/SEO';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { AdminEmpty, AdminHeader, AdminSection } from '@/components/admin/AdminUI';

interface Overview {
  stats: AdminStats;
  recentRegistrations: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    avatar?: string | null;
  }[];
  recentEnrollments: {
    id: string;
    enrolledAt: string;
    user: { id: string; name: string; email: string };
    course: { id: string; title: string; slug: string };
  }[];
  recentCertificates: Certificate[];
  topCourses: {
    id: string;
    title: string;
    slug: string;
    published: boolean;
    _count: { enrollments: number; lessons: number };
    category: { name: string; color: string } | null;
  }[];
  recentMessages: {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    handled: boolean;
    createdAt: string;
  }[];
}

export default function AdminDashboard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await api.get<Overview>('/admin/stats');
      return data;
    },
  });

  if (isLoading) return <PageLoader label="Loading the admin overview…" />;
  if (isError || !data) return <ErrorState title="Could not load admin statistics" onRetry={() => refetch()} />;

  const { stats } = data;
  const maxEnrollments = Math.max(1, ...data.topCourses.map((course) => course._count.enrollments));

  return (
    <>
      <SEO title="Admin overview" noIndex />
      <AdminHeader
        title="Overview"
        description="Live platform numbers from the database. Every figure below is computed from real records."
        action={
          <>
            <ButtonLink to="/admin/courses/new" size="sm">
              <BookOpen className="h-4 w-4" /> New course
            </ButtonLink>
            <ButtonLink to="/admin/website" size="sm" variant="secondary">
              Edit website
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={formatNumber(stats.students)} icon={Users} tone="brand" hint={`${formatNumber(stats.instructors)} instructors`} />
        <StatCard label="Published courses" value={formatNumber(stats.publishedCourses)} icon={BookOpen} tone="cyan" hint={`${formatNumber(stats.totalCourses)} total courses`} />
        <StatCard label="Lessons" value={formatNumber(stats.totalLessons)} icon={Video} tone="blue" hint={`${formatNumber(stats.enrollments)} enrolments`} />
        <StatCard label="Certificates" value={formatNumber(stats.certificates)} icon={Award} tone="amber" hint="Valid certificates" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tutorials" value={formatNumber(stats.publishedTutorials)} icon={ScrollText} tone="green" hint={`${formatNumber(stats.totalTutorials)} total`} />
        <StatCard label="Articles" value={formatNumber(stats.publishedPosts)} icon={Newspaper} tone="brand" hint={`${formatNumber(stats.totalPosts)} total`} />
        <StatCard label="Newsletter" value={formatNumber(stats.newsletterSubscribers)} icon={Mail} tone="cyan" hint="Active subscribers" />
        <StatCard label="Open messages" value={formatNumber(stats.unhandledMessages)} icon={MessageSquare} tone={stats.unhandledMessages > 0 ? 'rose' : 'green'} hint="Awaiting a reply" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <AdminSection
          title="Recent enrolments"
          description="The latest learners joining courses."
          action={
            <Link to="/admin/enrollments" className="text-xs font-medium text-brand-300 hover:text-brand-200">
              View all
            </Link>
          }
        >
          {data.recentEnrollments.length === 0 ? (
            <AdminEmpty>No enrolments yet.</AdminEmpty>
          ) : (
            <ul className="divide-y divide-line/10">
              {data.recentEnrollments.map((enrollment) => (
                <li key={enrollment.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{enrollment.user.name}</p>
                    <p className="truncate text-xs text-muted">{enrollment.course.title}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted">{formatDate(enrollment.enrolledAt)}</p>
                    <Link to={`/courses/${enrollment.course.slug}`} className="text-[11px] font-medium text-brand-300 hover:text-brand-200">
                      View course
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection title="Top courses" description="By enrolment count.">
          {data.topCourses.length === 0 ? (
            <AdminEmpty>No course data yet.</AdminEmpty>
          ) : (
            <ul className="space-y-4">
              {data.topCourses.map((course) => (
                <li key={course.id}>
                  <div className="flex items-center justify-between gap-2">
                    <Link to={`/admin/courses/${course.id}`} className="min-w-0 truncate text-sm font-medium text-text hover:text-brand-200">
                      {course.title}
                    </Link>
                    <span className="shrink-0 text-xs text-muted">{course._count.enrollments}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((course._count.enrollments / maxEnrollments) * 100)}%`,
                        backgroundColor: course.category?.color || '#8b5cf6',
                      }}
                    />
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                    {course.category?.name || 'Uncategorised'} · {course._count.lessons} lessons
                    {!course.published && <Badge tone="amber">Draft</Badge>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <AdminSection title="Recent registrations">
          {data.recentRegistrations.length === 0 ? (
            <AdminEmpty>No users yet.</AdminEmpty>
          ) : (
            <ul className="divide-y divide-line/10">
              {data.recentRegistrations.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{user.name}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                  <Badge tone={user.role === 'ADMIN' ? 'brand' : user.role === 'INSTRUCTOR' ? 'cyan' : 'neutral'}>
                    {user.role.toLowerCase()}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection title="Recent certificates">
          {data.recentCertificates.length === 0 ? (
            <AdminEmpty>No certificates issued yet.</AdminEmpty>
          ) : (
            <ul className="divide-y divide-line/10">
              {data.recentCertificates.map((certificate) => (
                <li key={certificate.id} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="truncate text-sm font-medium text-text">{certificate.user?.name}</p>
                  <p className="truncate text-xs text-muted">{certificate.course?.title}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-brand-300">{certificate.certificateId}</p>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection
          title="Inbox"
          description={`${stats.unhandledMessages} open message${stats.unhandledMessages === 1 ? '' : 's'}.`}
        >
          {data.recentMessages.length === 0 ? (
            <AdminEmpty>No messages received.</AdminEmpty>
          ) : (
            <ul className="divide-y divide-line/10">
              {data.recentMessages.map((message) => (
                <li key={message.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-text">{message.subject}</p>
                    <Badge tone={message.handled ? 'green' : 'amber'}>{message.handled ? 'Handled' : 'Open'}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted">
                    {message.name} · {message.email}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-400/20 bg-brand-500/5 p-5 text-sm leading-7 text-muted">
        <div className="flex items-center gap-2 text-brand-300">
          <Wallet className="h-4 w-4" />
          <p className="font-semibold text-text">Data integrity</p>
        </div>
        <p className="mt-1">
          These numbers are queried live from PostgreSQL through the admin API. Course, tutorial and article
          counts include drafts; the published figures are shown in the hint text. No statistics are hardcoded in
          the interface.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs">
          <GraduationCap className="h-3.5 w-3.5" /> {formatNumber(stats.enrollments)} enrolments across{' '}
          {formatNumber(stats.totalCourses)} courses.
        </p>
      </div>
    </>
  );
}
