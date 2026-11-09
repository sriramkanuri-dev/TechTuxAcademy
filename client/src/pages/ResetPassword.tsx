import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { SEO } from '@/components/seo/SEO';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post<{ message: string }>('/auth/reset-password', { token, password });
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
        subtitle="Choose a strong password with at least eight characters, including a letter and a number."
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
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {message} Redirecting to sign in…
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              hint="At least 8 characters with a letter and a number."
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              <KeyRound className="h-4 w-4" />
              Update password
            </Button>
          </form>
        )}
      </AuthShell>
    </>
  );
}
