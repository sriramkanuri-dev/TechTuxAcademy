import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Compass,
  GraduationCap,
  Languages,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { HomeData } from '@/lib/types';
import { formatNumber } from '@/lib/utils';
import { SEO } from '@/components/seo/SEO';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ButtonLink } from '@/components/ui/Button';

const values = [
  {
    icon: Target,
    title: 'Fundamentals over fads',
    body: 'Tools change. Understanding the operating system, the network, the compiler and the transistor does not. We teach the durable layer first.',
  },
  {
    icon: Lightbulb,
    title: 'Clarity is the feature',
    body: 'Every lesson aims to remove confusion, not add jargon. If an explanation needs a diagram, we draw it. If it needs a demo, we run it.',
  },
  {
    icon: Languages,
    title: 'Accessible in Telugu',
    body: 'Telugu-speaking learners should not have to translate their ambition. Key summaries, tutorials and interface labels are available in Telugu.',
  },
  {
    icon: ShieldCheck,
    title: 'Honest and secure',
    body: 'No fake urgency, no inflated claims. Secure sessions, server-side authorisation and careful data handling are part of the product.',
  },
];

const timeline = [
  {
    year: 'The beginning',
    title: 'A Linux study group',
    body: 'TechTuxAcademy started as a small study group working through Linux administration, shell scripting and networking after college hours.',
  },
  {
    year: 'The platform',
    title: 'Structured courses',
    body: 'The study notes became courses: recorded lessons, written summaries, labs and progress tracking, all in one place.',
  },
  {
    year: 'The expansion',
    title: 'Silicon to cloud',
    body: 'We added programming, AI, IoT, VLSI and cloud paths so learners can move from fundamentals to the systems they want to build.',
  },
  {
    year: 'Today',
    title: 'A modern academy',
    body: 'A full learning platform with verifiable certificates, Telugu support, a public blog and a student dashboard built on real progress.',
  },
];

export default function About() {
  const { data } = useQuery({
    queryKey: ['site-home'],
    queryFn: async () => {
      const { data } = await api.get<HomeData>('/site/home');
      return data;
    },
  });

  const settings = data?.settings || {};
  const title = typeof settings.aboutTitle === 'string' ? settings.aboutTitle : 'Technology education that respects your time';
  const description =
    typeof settings.aboutDescription === 'string'
      ? settings.aboutDescription
      : 'TechTuxAcademy is an independent learning platform for students, developers, Linux enthusiasts and electronics engineers.';
  const mission =
    typeof settings.aboutMission === 'string'
      ? settings.aboutMission
      : 'Our mission is to make high-quality technology education accessible to every learner, including those who think and learn in Telugu.';

  return (
    <>
      <SEO
        title="About"
        description={description}
        path="/about"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'About TechTuxAcademy',
          description,
        }}
      />
      <PageHeader
        eyebrow="About the academy"
        title={title}
        description={description}
        breadcrumb={[{ label: 'About' }]}
      />

      <section className="section container-page">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="eyebrow">
              <Compass className="h-3.5 w-3.5" /> Our mission
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-text">{mission}</h2>
            <p className="mt-5 text-base leading-8 text-muted">
              We build in the open, keep content practical, and measure success by what our students
              can build. Courses combine embedded video lessons with written notes, curated resources
              and clear checkpoints, so learning does not stop at watching.
            </p>
            <p className="mt-4 text-base leading-8 text-muted">
              The platform is designed for people balancing study, work and family. Learn at your own
              pace, resume where you left off, and earn a certificate when you cross the completion
              threshold for a course.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/courses">
                <BookOpen className="h-4 w-4" /> Explore courses
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink to="/contact" variant="secondary">
                Talk to us
              </ButtonLink>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Learners', value: data?.stats.students, icon: Users, tone: 'text-brand-300' },
              { label: 'Published courses', value: data?.stats.courses, icon: BookOpen, tone: 'text-cyan-300' },
              { label: 'Lessons', value: data?.stats.lessons, icon: GraduationCap, tone: 'text-emerald-300' },
              { label: 'Certificates issued', value: data?.stats.certificates, icon: BadgeCheck, tone: 'text-amber-300' },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="card-surface p-6">
                <Icon className={`h-6 w-6 ${tone}`} />
                <p className="mt-4 font-display text-3xl font-bold text-text">
                  {value === undefined ? '—' : formatNumber(value)}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line/10 bg-surface/30">
        <div className="section container-page">
          <SectionHeading
            eyebrow="What we believe"
            title="Principles that shape every lesson"
            description="These are not marketing lines. They are the constraints we use when deciding what to publish."
            align="center"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ icon: Icon, title: valueTitle, body }) => (
              <div key={valueTitle} className="card-surface h-full p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-400/25 bg-brand-500/10">
                  <Icon className="h-5 w-5 text-brand-300" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-text">{valueTitle}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section container-page">
        <SectionHeading
          eyebrow="The journey"
          title="From a study group to a learning platform"
          description="We are still small, still independent, and still obsessed with clear explanations."
        />
        <div className="relative space-y-6 border-l border-line/15 pl-6 sm:pl-8">
          {timeline.map((item) => (
            <div key={item.title} className="relative">
              <span className="absolute -left-[33px] top-1 flex h-4 w-4 items-center justify-center rounded-full border border-brand-400/50 bg-bg sm:-left-[41px]">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">{item.year}</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-text">{item.title}</h3>
              <p className="mt-1.5 max-w-2xl text-sm leading-7 text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="rounded-3xl border border-brand-400/25 bg-gradient-to-br from-brand-500/15 via-card to-cyan-500/10 p-8 sm:p-12">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="eyebrow">
                <Sparkles className="h-3.5 w-3.5" /> Learn. Build. Innovate.
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-text sm:text-3xl">
                Ready to build something that lasts?
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-muted">
                Start free, choose a path, and make steady progress. Your dashboard keeps the next
                lesson ready.
              </p>
            </div>
            <ButtonLink to="/register" size="lg">
              Start learning free
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
