import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, Send } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { SEO } from '@/components/seo/SEO';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email });
      setMessage(data.message);
    } catch (submitError) {
      setError(apiErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Forgot password" path="/forgot-password" noIndex />
      <AuthShell
        title="Reset your password"
        subtitle="Enter the email address you signed up with and we will send a reset link."
        footer={
          <p>
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-brand-300 hover:text-brand-200">
              Back to sign in
            </Link>
          </p>
        }
      >
        {message ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-sm leading-7 text-emerald-100">
            <MailCheck className="mb-3 h-6 w-6 text-emerald-300" />
            <p>{message}</p>
            <p className="mt-3 text-xs text-emerald-200/80">
              Check your inbox and spam folder. The link expires in 30 minutes and can only be
              used once.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              <Send className="h-4 w-4" />
              Send reset link
            </Button>
          </form>
        )}
      </AuthShell>
    </>
  );
}
