import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Logo } from '@/components/ui/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { SearchDialog } from '@/components/SearchDialog';
import { cn } from '@/lib/utils';

const links = [
  { to: '/courses', key: 'nav.courses' as const },
  { to: '/tutorials', key: 'nav.tutorials' as const },
  { to: '/blog', key: 'nav.blog' as const },
  { to: '/categories', key: 'nav.categories' as const },
  { to: '/about', key: 'nav.about' as const },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line/10 bg-bg/80 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-2 text-sm font-medium transition',
                      isActive ? 'text-text' : 'text-muted hover:bg-line/5 hover:text-text'
                    )
                  }
                >
                  {t(link.key)}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden items-center gap-2 rounded-xl border border-line/10 bg-surface/60 px-3 py-2 text-sm text-muted transition hover:border-brand-400/30 hover:text-text sm:flex"
              aria-label="Open search"
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden rounded border border-line/15 bg-elevated px-1.5 py-0.5 font-mono text-[10px] md:inline">
                /
              </kbd>
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="rounded-lg p-2 text-muted transition hover:bg-line/5 hover:text-text sm:hidden"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              onClick={toggleLanguage}
              className="rounded-lg px-2 py-2 text-xs font-semibold text-muted transition hover:bg-line/5 hover:text-text"
              aria-label="Toggle language"
              title={language === 'en' ? 'తెలుగులో చూడండి' : 'View in English'}
            >
              {language === 'en' ? 'తెలు' : 'EN'}
            </button>

            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-muted transition hover:bg-line/5 hover:text-text"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {user ? (
              <div className="relative hidden sm:block" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-xl border border-line/10 bg-surface/60 py-1.5 pl-1.5 pr-2.5 transition hover:border-brand-400/30"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <Avatar name={user.name} src={user.avatar} size="xs" />
                  <span className="max-w-[110px] truncate text-sm font-medium text-text">{user.name.split(' ')[0]}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 text-muted transition', menuOpen && 'rotate-180')} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 animate-scale-in overflow-hidden rounded-xl border border-line/15 bg-card p-1.5 shadow-2xl" role="menu">
                    <div className="border-b border-line/10 px-3 py-2.5">
                      <p className="truncate text-sm font-semibold text-text">{user.name}</p>
                      <p className="truncate text-xs text-muted">{user.email}</p>
                    </div>
                    <MenuLink to="/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
                    <MenuLink to="/dashboard/courses" icon={BookOpen} label={t('nav.myLearning')} />
                    <MenuLink to="/dashboard/certificates" icon={Award} label={t('nav.certificates')} />
                    <MenuLink to="/dashboard/profile" icon={UserIcon} label={t('nav.profile')} />
                    {user.role === 'ADMIN' && (
                      <MenuLink to="/admin" icon={ShieldCheck} label={t('nav.admin')} />
                    )}
                    <button
                      onClick={handleLogout}
                      className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-300 transition hover:bg-rose-500/10"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <ButtonLink to="/login" variant="ghost" size="sm">
                  {t('nav.login')}
                </ButtonLink>
                <ButtonLink to="/register" size="sm">
                  {t('nav.register')}
                </ButtonLink>
              </div>
            )}

            <button
              onClick={() => setMobileOpen((open) => !open)}
              className="rounded-lg p-2 text-muted transition hover:bg-line/5 hover:text-text lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-line/10 bg-card/95 px-4 pb-5 pt-3 backdrop-blur-xl lg:hidden">
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-2.5 text-sm font-medium transition',
                      isActive ? 'bg-brand-500/10 text-brand-200' : 'text-muted hover:bg-line/5 hover:text-text'
                    )
                  }
                >
                  {t(link.key)}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 border-t border-line/10 pt-3">
              {user ? (
                <div className="space-y-1">
                  <div className="mb-2 flex items-center gap-2 px-2">
                    <Avatar name={user.name} src={user.avatar} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">{user.name}</p>
                      <p className="truncate text-xs text-muted">{user.email}</p>
                    </div>
                  </div>
                  <MenuLink to="/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
                  {user.role === 'ADMIN' && <MenuLink to="/admin" icon={ShieldCheck} label={t('nav.admin')} />}
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <ButtonLink to="/login" variant="secondary" size="md">
                    {t('nav.login')}
                  </ButtonLink>
                  <ButtonLink to="/register" size="md">
                    {t('nav.register')}
                  </ButtonLink>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function MenuLink({ to, icon: Icon, label }: { to: string; icon: typeof LayoutDashboard; label: string }) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-line/5 hover:text-text"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
