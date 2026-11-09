import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MailCheck, Save, ShieldCheck, UserRound } from 'lucide-react';
import { api, apiErrorMessage, assetUrl } from '@/lib/api';
import type { User } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEO } from '@/components/seo/SEO';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { language, setLanguage } = useLanguage();
  const [form, setForm] = useState({
    name: '',
    bio: '',
    bioTe: '',
    avatar: '',
    preferredLanguage: 'en' as 'en' | 'te',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      bio: user.bio || '',
      bioTe: user.bioTe || '',
      avatar: user.avatar || '',
      preferredLanguage: (user.preferredLanguage as 'en' | 'te') || 'en',
    });
  }, [user]);

  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = useMutation({
    mutationFn: async () => {
      const { data } = await api.put<{ user: User; message: string }>('/auth/profile', {
        name: form.name,
        bio: form.bio || null,
        bioTe: form.bioTe || null,
        avatar: form.avatar || null,
        preferredLanguage: form.preferredLanguage,
      });
      return data;
    },
    onSuccess: (data) => {
      setUser(data.user);
      setLanguage(form.preferredLanguage);
      toast.success(data.message);
      setError('');
    },
    onError: (mutationError) => setError(apiErrorMessage(mutationError)),
  });

  const resend = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ message: string }>('/auth/resend-verification');
      return data;
    },
    onSuccess: (data) => toast.success(data.message),
    onError: (mutationError) => toast.error(apiErrorMessage(mutationError)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    save.mutate();
  };

  return (
    <>
      <SEO title="Profile" noIndex />
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-muted">
          Keep your details current. Your name appears on certificates, so use the name you want printed.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={submit} className="card-surface space-y-5 p-6">
          {error && (
            <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <div className="flex items-center gap-4">
            <Avatar name={form.name || user?.name || 'Learner'} src={form.avatar} size="lg" />
            <div>
              <p className="text-sm font-semibold text-text">Profile photo</p>
              <p className="text-xs text-muted">Paste a hosted image URL. Leave blank to use your initials.</p>
            </div>
          </div>

          <Input
            label="Avatar image URL"
            type="url"
            value={form.avatar}
            onChange={update('avatar')}
            placeholder="https://example.com/photo.jpg"
          />

          <Input
            label="Full name"
            required
            minLength={2}
            maxLength={80}
            value={form.name}
            onChange={update('name')}
            hint="This name is used on your certificates."
          />

          <div>
            <label className="label-base" htmlFor="profile-email">
              Email address
            </label>
            <input
              id="profile-email"
              value={user?.email || ''}
              readOnly
              disabled
              className="input-base cursor-not-allowed opacity-70"
            />
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
              {user?.emailVerified ? (
                <Badge tone="green">
                  <MailCheck className="h-2.5 w-2.5" /> Verified
                </Badge>
              ) : (
                <>
                  <Badge tone="amber">Unverified</Badge>
                  <button
                    type="button"
                    onClick={() => resend.mutate()}
                    disabled={resend.isPending}
                    className="font-medium text-brand-300 hover:text-brand-200 disabled:opacity-60"
                  >
                    {resend.isPending ? 'Sending…' : 'Resend verification email'}
                  </button>
                </>
              )}
            </p>
          </div>

          <Select
            label="Preferred language"
            value={form.preferredLanguage}
            onChange={update('preferredLanguage')}
            hint="Used for Telugu summaries across the site."
          >
            <option value="en">English</option>
            <option value="te">తెలుగు (Telugu)</option>
          </Select>

          <Textarea
            label="Bio (English)"
            rows={4}
            maxLength={600}
            value={form.bio}
            onChange={update('bio')}
            placeholder="Tell the community what you are learning and building."
            hint={`${form.bio.length}/600 characters`}
          />

          <Textarea
            label="Bio (Telugu)"
            rows={3}
            maxLength={600}
            value={form.bioTe}
            onChange={update('bioTe')}
            placeholder="తెలుగులో మీ గురించి రాయండి."
            hint={`${form.bioTe.length}/600 characters`}
          />

          <div className="flex items-center gap-3 border-t border-line/10 pt-5">
            <Button type="submit" loading={save.isPending}>
              <Save className="h-4 w-4" /> Save profile
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setForm({
                  name: user?.name || '',
                  bio: user?.bio || '',
                  bioTe: user?.bioTe || '',
                  avatar: user?.avatar || '',
                  preferredLanguage: (user?.preferredLanguage as 'en' | 'te') || 'en',
                })
              }
            >
              Reset
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="card-surface p-5">
            <div className="flex items-center gap-2 text-brand-300">
              <UserRound className="h-4 w-4" />
              <p className="text-sm font-semibold">Account</p>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">Role</dt>
                <dd className="font-medium text-text">{user?.role?.toLowerCase()}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">Language</dt>
                <dd className="font-medium text-text">{language === 'te' ? 'Telugu' : 'English'}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">Email</dt>
                <dd className="font-medium text-text">{user?.emailVerified ? 'Verified' : 'Unverified'}</dd>
              </div>
            </dl>
          </div>

          {form.avatar && (
            <div className="card-surface overflow-hidden p-0">
              <img
                src={assetUrl(form.avatar)}
                alt="Avatar preview"
                className="aspect-square w-full object-cover"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="rounded-2xl border border-brand-400/20 bg-brand-500/5 p-5 text-sm leading-7 text-muted">
            <div className="flex items-center gap-2 text-brand-300">
              <ShieldCheck className="h-4 w-4" />
              <p className="font-semibold text-text">Your data</p>
            </div>
            <p className="mt-1">
              We only use your details to run your account, issue certificates and send essential emails. We do
              not sell learner data.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
