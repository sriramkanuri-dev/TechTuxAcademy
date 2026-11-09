import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  GraduationCap,
  Languages,
  Layers,
  PlayCircle,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Terminal,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { HomeData } from '@/lib/types';
import { formatNumber } from '@/lib/utils';
import { SEO } from '@/components/seo/SEO';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ButtonLink } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Spinner';
import { CourseCard } from '@/components/cards/CourseCard';
import { TutorialCard } from '@/components/cards/TutorialCard';
import { PostCard } from '@/components/cards/PostCard';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { Reveal } from '@/components/ui/Reveal';
import { useLanguage } from '@/contexts/LanguageContext';

function settingText(settings: Record<string, unknown> | undefined, key: string, fallback: string) {
  const value = settings?.[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

const features = [
  {
    icon: Terminal,
    title: 'Linux-first, real commands',
    body: 'Every lesson runs on real systems. No toy examples, no unexplained copy-paste.',
  },
  {
    icon: Layers,
    title: 'Structured learning paths',
    body: 'Courses build from fundamentals to production patterns, so each lesson compounds.',
  },
  {
    icon: Video,
    title: 'Curated video lessons',
    body: 'Embedded YouTube lessons from trusted educators, paired with written notes and resources.',
  },
  {
    icon: BadgeCheck,
    title: 'Verifiable certificates',
    body: 'Finish a course and earn a PDF certificate with a unique ID and QR verification.',
  },
  {
    icon: Languages,
    title: 'English and Telugu',
    body: 'Course summaries, tutorials and interface labels are available in Telugu.',
  },
  {
    icon: ShieldCheck,
    title: 'Built for trust',
    body: 'Secure sessions, server-side authorisation, rate limiting and no dark patterns.',
  },
];

export default function Home() {
  const { t, pick } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ['site-home'],
    queryFn: async () => {
      const { data } = await api.get<HomeData>('/site/home');
      return data;
    },
  });

  const settings = data?.settings;
  const heroTitle = settingText(settings, 'heroTitle', 'Master Technology.');
  const heroHighlight = settingText(settings, 'heroHighlight', 'Build Your Future.');
  const heroDescription = settingText(
    settings,
    'heroDescription',
    'Practical, project-driven courses in Linux, programming, AI, electronics and cloud — taught with clarity, built for the real world.'
  );
  const heroEyebrow = settingText(settings, 'heroEyebrow', 'A modern technology academy');
  const primaryCta = settingText(settings, 'heroPrimaryCta', 'Explore Courses');
  const secondaryCta = settingText(settings, 'heroSecondaryCta', 'Start Learning');

  return (
    <>
      <SEO
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'EducationalOrganization',
          name: 'TechTuxAcademy',
          url: 'https://techtuxacademy.online',
          slogan: 'Learn. Build. Innovate.',
          sameAs: ['https://twitter.com/techtuxacademy', 'https://github.com/techtuxacademy'],
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-60" aria-hidden="true" />
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-24 top-32 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden="true" />
        <div className="container-page relative grid items-center gap-14 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
          <div>
            <p className="eyebrow animate-fade-up">
              <Sparkles className="h-3.5 w-3.5" />
              {heroEyebrow}
            </p>
            <h1 className="mt-5 animate-fade-up font-display text-4xl font-bold leading-[1.06] tracking-tight text-text sm:text-5xl lg:text-6xl">
              {heroTitle}
              <br />
              <span className="gradient-text">{heroHighlight}</span>
            </h1>
            <p className="mt-6 max-w-xl animate-fade-up text-base leading-8 text-muted sm:text-lg">
              {heroDescription}
            </p>
            <div className="mt-8 flex animate-fade-up flex-wrap items-center gap-3">
              <ButtonLink to="/courses" size="lg">
                <BookOpen className="h-5 w-5" />
                {primaryCta}
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink to="/register" variant="secondary" size="lg">
                <PlayCircle className="h-5 w-5" />
                {secondaryCta}
              </ButtonLink>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              {t('home.trusted')}
            </p>

            <dl className="mt-10 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: t('home.statsStudents'), value: data?.stats.students },
                { label: t('home.statsCourses'), value: data?.stats.courses },
                { label: t('home.statsLessons'), value: data?.stats.lessons },
                { label: t('home.statsCertificates'), value: data?.stats.certificates },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-line/10 bg-card/60 px-4 py-3 backdrop-blur">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{stat.label}</dt>
                  <dd className="mt-1 font-display text-xl font-bold text-text">
                    {stat.value === undefined ? '—' : formatNumber(stat.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute inset-0 -m-6 rounded-[2rem] bg-brand-gradient opacity-10 blur-2xl" aria-hidden="true" />
            <div className="relative space-y-4">
              <div className="glass rounded-2xl p-5 shadow-glow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white">
                      <Terminal className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text">Linux Essentials</p>
                      <p className="text-xs text-muted">Zero to command-line hero</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                    Beginner
                  </span>
                </div>
                <div className="mt-4 space-y-2 rounded-xl border border-line/10 bg-[#08080d] p-4 font-mono text-[12px] leading-6 text-slate-300">
                  <p>
                    <span className="text-emerald-400">$</span> sudo apt update
                  </p>
                  <p>
                    <span className="text-emerald-400">$</span> systemctl status ssh
                  </p>
                  <p className="text-brand-300">● active (running) — 2 days</p>
                  <p>
                    <span className="text-emerald-400">$</span> <span className="animate-pulse">▍</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    <Cpu className="h-4 w-4 text-cyan-300" /> VLSI
                  </div>
                  <p className="mt-2 text-sm font-semibold text-text">RTL to GDSII</p>
                  <p className="mt-1 text-xs text-muted">A complete design flow</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/10">
                    <div className="h-full w-2/3 rounded-full bg-brand-gradient" />
                  </div>
                </div>
                <div className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    <Code2 className="h-4 w-4 text-brand-300" /> Full stack
                  </div>
                  <p className="mt-2 text-sm font-semibold text-text">React + Node</p>
                  <p className="mt-1 text-xs text-muted">Ship a real product</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/10">
                    <div className="h-full w-1/2 rounded-full bg-brand-gradient" />
                  </div>
                </div>
              </div>

              <div className="glass flex items-center gap-3 rounded-2xl p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10">
                  <BadgeCheck className="h-5 w-5 text-amber-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text">Certificate issued</p>
                  <p className="truncate font-mono text-[11px] text-muted">TTA-2026-DEMO0001 · verified</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">Valid</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Announcements */}
      {data?.announcements && data.announcements.length > 0 && (
        <section className="container-page -mt-2 pb-4">
          <div className="grid gap-3 md:grid-cols-2">
            {data.announcements.slice(0, 2).map((announcement) => (
              <div
                key={announcement.id}
                className="flex items-start gap-3 rounded-xl border border-brand-400/20 bg-brand-500/5 px-4 py-3 text-sm text-muted"
              >
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                <p>
                  <span className="font-semibold text-text">{announcement.title}</span>{' '}
                  {pick(announcement.message, announcement.messageTe)}
                  {announcement.link && (
                    <Link to={announcement.link} className="ml-1 font-medium text-brand-300 hover:text-brand-200">
                      Learn more
                    </Link>
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="section container-page">
        <SectionHeading
          eyebrow="Learning paths"
          title={t('home.learningPaths')}
          description={t('home.learningSub')}
          action={
            <ButtonLink to="/categories" variant="secondary" size="sm">
              {t('home.browseCategories')}
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          }
        />
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {data?.categories.map((category, index) => (
              <Reveal key={category.id} delay={index * 40}>
                <CategoryCard category={category} className="h-full" />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* Featured courses */}
      <section className="border-y border-line/10 bg-surface/30">
        <div className="section container-page">
          <SectionHeading
            eyebrow="Curated"
            title={t('home.featuredCourses')}
            description={t('home.featuredSub')}
            action={
              <ButtonLink to="/courses" variant="secondary" size="sm">
                {t('common.viewAll')}
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            }
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, index) => <CardSkeleton key={index} />)
              : data?.featuredCourses.map((course, index) => (
                  <Reveal key={course.id} delay={index * 50}>
                    <CourseCard course={course} className="h-full" />
                  </Reveal>
                ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="section container-page">
        <SectionHeading
          eyebrow="The academy"
          title={t('home.whyChoose')}
          description={t('home.whySub')}
          align="center"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }, index) => (
            <Reveal key={title} delay={index * 40}>
              <div className="card-surface h-full p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-400/25 bg-brand-500/10">
                  <Icon className="h-5 w-5 text-brand-300" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-text">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Linux tutorials */}
      <section className="border-y border-line/10 bg-surface/30">
        <div className="section container-page">
          <SectionHeading
            eyebrow="Linux"
            title={t('home.linuxTutorials')}
            description={t('home.linuxSub')}
            action={
              <ButtonLink to="/tutorials" variant="secondary" size="sm">
                All tutorials
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            }
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} />)
              : data?.linuxTutorials.map((tutorial, index) => (
                  <Reveal key={tutorial.id} delay={index * 50}>
                    <TutorialCard tutorial={tutorial} className="h-full" />
                  </Reveal>
                ))}
          </div>
        </div>
      </section>

      {/* Blog */}
      <section className="section container-page">
        <SectionHeading
          eyebrow="Writing"
          title={t('home.latestArticles')}
          description={t('home.latestSub')}
          action={
            <ButtonLink to="/blog" variant="secondary" size="sm">
              All articles
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          }
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} />)
            : data?.posts.map((post, index) => (
                <Reveal key={post.id} delay={index * 50}>
                  <PostCard post={post} className="h-full" />
                </Reveal>
              ))}
        </div>
      </section>

      {/* Testimonials */}
      {data?.testimonials && data.testimonials.length > 0 && (
        <section className="border-y border-line/10 bg-surface/30">
          <div className="section container-page">
            <SectionHeading
              eyebrow="Community"
              title={t('home.testimonials')}
              description={t('home.testimonialsSub')}
              align="center"
            />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {data.testimonials.map((testimonial, index) => (
                <Reveal key={testimonial.id} delay={index * 40}>
                  <figure className="card-surface flex h-full flex-col p-6">
                    <Quote className="h-6 w-6 text-brand-400/60" />
                    <blockquote className="mt-4 flex-1 text-sm leading-7 text-muted">
                      “{pick(testimonial.quote, testimonial.quoteTe)}”
                    </blockquote>
                    <figcaption className="mt-5 flex items-center justify-between gap-3 border-t border-line/10 pt-4">
                      <div>
                        <p className="text-sm font-semibold text-text">{testimonial.name}</p>
                        <p className="text-xs text-muted">{testimonial.role}</p>
                      </div>
                      <span className="flex items-center gap-0.5" aria-label={`${testimonial.rating} out of 5`}>
                        {Array.from({ length: 5 }).map((_, star) => (
                          <Star
                            key={star}
                            className={
                              star < testimonial.rating
                                ? 'h-3.5 w-3.5 fill-amber-400 text-amber-400'
                                : 'h-3.5 w-3.5 text-line/30'
                            }
                          />
                        ))}
                      </span>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container-page py-20">
        <div className="relative overflow-hidden rounded-3xl border border-brand-400/25 bg-gradient-to-br from-brand-500/15 via-card to-cyan-500/10 p-8 text-center sm:p-14">
          <div className="absolute inset-0 bg-dots opacity-30" aria-hidden="true" />
          <div className="relative">
            <span className="eyebrow">
              <GraduationCap className="h-3.5 w-3.5" /> Learn. Build. Innovate.
            </span>
            <h2 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Start with one lesson. Build something real this month.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted">
              Join {data ? formatNumber(data.stats.students) : 'our'} learners working through Linux, code,
              electronics and AI. Free to start, self-paced, and structured for real progress.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink to="/register" size="lg">
                <Users className="h-5 w-5" />
                {t('home.startFree')}
              </ButtonLink>
              <ButtonLink to="/courses" variant="secondary" size="lg">
                <Clock className="h-5 w-5" />
                {t('home.explore')}
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
