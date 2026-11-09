import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, KeyRound, Languages, Moon, Sun } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import type { Language } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { SEO } from '@/components/seo/SEO';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const changePassword = useMutation({
    mutationFn: async () => {
      const { data } = await api.put<{ message: string }>('/auth/password', {
        ...(user?.email ? { currentPassword: form.currentPassword } : {}),
        newPassword: form.newPassword,
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setError('');
    },
    onError: (mutationError) => setError(apiErrorMessage(mutationError)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) {
      setError('The new passwords do not match.');
      return;
    }
    changePassword.mutate();
  };

  return (
    <>
      <SEO title="Settings" noIndex />
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
          {t('dashboard.settings')}
        </h1>
        <p className="mt-1 text-sm text-muted">Control your appearance, language and account security.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-surface p-6">
          <h2 className="font-display text-lg font-semibold text-text">Appearance</h2>
          <p className="mt-1 text-sm text-muted">Choose how TechTuxAcademy looks on this device.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { value: 'dark' as const, label: 'Dark', description: 'Deep charcoal, easier at night', icon: Moon },
              { value: 'light' as const, label: 'Light', description: 'Bright, high contrast', icon: Sun },
            ].map(({ value, label, description, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={theme === value}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-4 text-left transition',
                  theme === value
                    ? 'border-brand-400/50 bg-brand-500/10'
                    : 'border-line/10 bg-surface/40 hover:border-brand-400/30'
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                    theme === value
                      ? 'border-brand-400/40 bg-brand-500/15 text-brand-300'
                      : 'border-line/10 bg-elevated text-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-text">{label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{description}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="card-surface p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text">
            <Languages className="h-5 w-5 text-brand-300" /> Language
          </h2>
          <p className="mt-1 text-sm text-muted">
            Telugu summaries appear across courses, tutorials and interface labels where available.
          </p>
          <Select
            className="mt-4"
            label="Interface and content language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
          >
            <option value="en">English</option>
            <option value="te">తెలుగు (Telugu)</option>
          </Select>
          <p className="mt-3 rounded-xl border border-line/10 bg-surface/40 px-4 py-3 text-xs leading-6 text-muted">
            Your choice is saved on this device. Update your preferred language in your profile to keep it
            consistent across devices.
          </p>
        </section>

        <section className="card-surface p-6 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text">
            <KeyRound className="h-5 w-5 text-brand-300" /> Password
          </h2>
          <p className="mt-1 text-sm text-muted">
            Use at least eight characters with a letter and a number. Changing your password does not sign you
            out of other devices automatically.
          </p>

          <form onSubmit={submit} className="mt-5 max-w-lg space-y-4">
            {error && (
              <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}
            <div className="relative">
              <Input
                label="Current password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
                hint="Required if your account has a password."
              />
              <button
                type="button"
                onClick={() => setShow((value) => !value)}
                className="absolute right-3 top-[34px] rounded-md p-1 text-muted transition hover:text-text"
                aria-label={show ? 'Hide passwords' : 'Show passwords'}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Input
              label="New password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              value={form.newPassword}
              onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
            />
            <Input
              label="Confirm new password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              value={form.confirm}
              onChange={(event) => setForm((current) => ({ ...current, confirm: event.target.value }))}
            />
            <Button type="submit" loading={changePassword.isPending}>
              Update password
            </Button>
          </form>
        </section>
      </div>
    </>
  );
}
