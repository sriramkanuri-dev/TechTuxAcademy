import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Award,
  BarChart3,
  BookOpen,
  FileText,
  FolderTree,
  Globe2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  ScrollText,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { ScrollToTop } from './PublicLayout';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/tutorials', label: 'Tutorials', icon: ScrollText },
  { to: '/admin/blog', label: 'Blog', icon: Newspaper },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/enrollments', label: 'Enrollments', icon: GraduationCap },
  { to: '/admin/certificates', label: 'Certificates', icon: Award },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/resources', label: 'Learning resources', icon: FileText },
  { to: '/admin/website', label: 'Website', icon: Globe2 },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen lg:flex">
      <ScrollToTop />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line/10 bg-surface/95 backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-line/10 px-5">
          <Logo size="sm" />
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5 text-muted" />
          </button>
        </div>

        <div className="border-b border-line/10 p-4">
          <div className="flex items-center gap-3 rounded-xl border border-brand-400/20 bg-brand-500/5 p-3">
            <Avatar name={user?.name || 'Admin'} src={user?.avatar} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">{user?.name}</p>
              <p className="text-xs font-medium text-brand-300">Administrator</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-500/12 text-brand-200'
                    : 'text-muted hover:bg-line/5 hover:text-text'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-line/10 p-3">
          <NavLink
            to="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-line/5 hover:text-text"
          >
            <Globe2 className="h-4 w-4" />
            View website
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line/10 bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-muted hover:bg-line/5 lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm font-medium text-muted">Admin console</p>
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
            Secure area
          </span>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
