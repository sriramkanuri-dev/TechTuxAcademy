import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { apiErrorMessage } from '@/lib/api';
import { SEO } from '@/components/seo/SEO';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', preferredLanguage: 'en' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        preferredLanguage: form.preferredLanguage as 'en' | 'te',
      });
      toast.success(result.message);
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(apiErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Create your account" path="/register" noIndex />
      <AuthShell
        title="Create your account"
        subtitle="Start learning with free, practical technology courses."
        footer={
          <p>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-300 hover:text-brand-200">
              Sign in
            </Link>
          </p>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}
          <Input
            label="Full name"
            autoComplete="name"
            required
            minLength={2}
            value={form.name}
            onChange={update('name')}
            placeholder="Your name"
          />
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={update('email')}
            placeholder="you@example.com"
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={update('password')}
              placeholder="At least 8 characters"
              hint="Use at least 8 characters with a letter and a number."
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-[34px] rounded-md p-1 text-muted transition hover:text-text"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Select
            label="Preferred language"
            value={form.preferredLanguage}
            onChange={update('preferredLanguage')}
            hint="You can switch at any time from the navigation bar."
          >
            <option value="en">English</option>
            <option value="te">తెలుగు (Telugu)</option>
          </Select>
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            <UserPlus className="h-4 w-4" />
            Create account
          </Button>
        </form>

        <GoogleButton onSuccess={() => navigate('/dashboard', { replace: true })} />

        <p className="mt-6 text-xs leading-5 text-muted">
          By creating an account you agree to learn with curiosity and respect. We will send a
          verification link to your email address.
        </p>
      </AuthShell>
    </>
  );
}
