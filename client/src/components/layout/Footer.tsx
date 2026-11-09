import { Link } from 'react-router-dom';
import { Github, Linkedin, Mail, MapPin, Twitter, Youtube } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { NewsletterForm } from '@/components/NewsletterForm';
import { useLanguage } from '@/contexts/LanguageContext';

const columns = [
  {
    title: 'Learn',
    links: [
      { label: 'All courses', to: '/courses' },
      { label: 'Tutorials', to: '/tutorials' },
      { label: 'Blog', to: '/blog' },
      { label: 'Categories', to: '/categories' },
      { label: 'Search', to: '/search' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Student dashboard', to: '/dashboard' },
      { label: 'My certificates', to: '/dashboard/certificates' },
      { label: 'Verify a certificate', to: '/verify-certificate' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/register' },
      { label: 'Forgot password', to: '/forgot-password' },
      { label: 'Profile', to: '/dashboard/profile' },
      { label: 'Settings', to: '/dashboard/settings' },
    ],
  },
];

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="relative mt-20 border-t border-line/10 bg-surface/40">
      <div className="container-page py-14">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo size="lg" />
            <p className="mt-4 max-w-sm text-sm leading-7 text-muted">
              A modern technology academy for students, developers, Linux enthusiasts and
              electronics engineers. Learn in English or Telugu, at your own pace.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {[
                { href: 'https://twitter.com/techtuxacademy', icon: Twitter, label: 'Twitter' },
                { href: 'https://github.com/techtuxacademy', icon: Github, label: 'GitHub' },
                { href: 'https://linkedin.com/company/techtuxacademy', icon: Linkedin, label: 'LinkedIn' },
                { href: 'https://youtube.com/@techtuxacademy', icon: Youtube, label: 'YouTube' },
              ].map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line/10 bg-card text-muted transition hover:border-brand-400/40 hover:text-brand-300"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            <div className="mt-6 space-y-2 text-sm text-muted">
              <a href="mailto:hello@techtuxacademy.online" className="flex items-center gap-2 hover:text-text">
                <Mail className="h-4 w-4" /> hello@techtuxacademy.online
              </a>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Hyderabad, Telangana, India
              </p>
            </div>
          </div>

          <div>
            <div className="grid gap-8 sm:grid-cols-3">
              {columns.map((column) => (
                <div key={column.title}>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-text">
                    {column.title}
                  </h3>
                  <ul className="mt-4 space-y-2.5">
                    {column.links.map((link) => (
                      <li key={link.to}>
                        <Link to={link.to} className="text-sm text-muted transition hover:text-brand-200">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-line/10 bg-card p-5">
              <h3 className="font-display text-base font-semibold text-text">{t('newsletter.title')}</h3>
              <p className="mt-1 text-sm text-muted">{t('newsletter.desc')}</p>
              <NewsletterForm className="mt-4" />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line/10 pt-6 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} TechTuxAcademy. {t('footer.rights')}</p>
          <p className="text-center sm:text-right">
            {t('footer.built')} · Course videos are embedded from YouTube and remain the property of
            their creators.
          </p>
        </div>
      </div>
    </footer>
  );
}
