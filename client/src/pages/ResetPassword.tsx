import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Eye, EyeOff, KeyRound, X } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { SEO } from '@/components/seo/SEO';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const rules = [
  { key: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { key: 'letter', label: 'Contains a letter', test: (value: string) => /[A-Za-z]/.test(value) },
  { key: 'number', label: 'Contains a number', test: (value: string) => /[0-9]/.test(value) },
];

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = (params.get('token') || '').trim();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const checks = useMemo(
    () => rules.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password]
  );
  const meetsRequirements = checks.every((rule) => rule.passed);
  const matches = password.length > 0 && password === confirm;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!meetsRequirements) {
      setError('Choose a password that meets all the requirements below.');
      return;
    }
    if (!matches) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post<{ message: string }>('/auth/reset-password', {
        token,
        password,
      });
      setMessage(data.message);
      window.setTimeout(() => navigate('/login', { replace: true }), 2200);
    } catch (submitError) {
      setError(apiErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Set a new password" path="/reset-password" noIndex />
      <AuthShell
        title="Set a new password"
        subtitle="Choose a strong password you have not used before."
        footer={
          <p>
            <Link to="/login" className="font-semibold text-brand-300 hover:text-brand-200">
              Back to sign in
            </Link>
          </p>
        }
      >
        {!token ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            This page needs a reset token. Open the link from your email, or request a new one from{' '}
            <Link to="/forgot-password" className="font-semibold underline">
              forgot password
            </Link>
            .
          </div>
        ) : message ? (
          <div
            role="status"
            className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          >
            {message} Redirecting to sign in…
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
              >
                {error}
              </div>
            )}
            <div className="relative">
              <Input
                label="New password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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

            <ul className="grid gap-1.5 rounded-xl border border-line/10 bg-surface/40 px-4 py-3 text-xs text-muted">
              {checks.map((rule) => (
                <li key={rule.key} className="flex items-center gap-2">
                  {rule.passed ? (
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-muted/60" />
                  )}
                  <span className={rule.passed ? 'text-emerald-200/90' : undefined}>{rule.label}</span>
                </li>
              ))}
            </ul>

            <div className="relative">
              <Input
                label="Confirm new password"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                error={confirm.length > 0 && !matches ? 'Passwords do not match.' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((value) => !value)}
                className="absolute right-3 top-[34px] rounded-md p-1 text-muted transition hover:text-text"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
              disabled={!meetsRequirements || !matches}
            >
              <KeyRound className="h-4 w-4" />
              Update password
            </Button>
            <p className="text-xs leading-5 text-muted/80">
              Resetting your password signs you out of all other devices. This link can only be
              used once.
            </p>
          </form>
        )}
      </AuthShell>
    </>
  );
}
