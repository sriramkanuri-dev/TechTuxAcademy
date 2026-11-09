import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BadgeCheck, CircleAlert, MailCheck } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { SEO } from '@/components/seo/SEO';
import { AuthShell } from '@/components/auth/AuthShell';
import { ButtonLink } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? 'Verifying your email address…' : 'This page needs a verification token.');
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    api
      .post<{ message: string }>('/auth/verify-email', { token })
      .then(({ data }) => {
        setState('success');
        setMessage(data.message);
      })
      .catch((error) => {
        setState('error');
        setMessage(apiErrorMessage(error));
      });
  }, [token]);

  return (
    <>
      <SEO title="Verify email" path="/verify-email" noIndex />
      <AuthShell
        title="Email verification"
        subtitle="Confirming your address keeps your account secure and unlocks certificate delivery."
        footer={
          <p>
            Need help?{' '}
            <Link to="/contact" className="font-semibold text-brand-300 hover:text-brand-200">
              Contact support
            </Link>
          </p>
        }
      >
        <div className="rounded-2xl border border-line/10 bg-card p-6">
          {state === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center text-sm text-muted">
              <Spinner className="h-8 w-8" />
              <p>{message}</p>
            </div>
          )}
          {state === 'success' && (
            <div className="text-center">
              <BadgeCheck className="mx-auto h-10 w-10 text-emerald-300" />
              <p className="mt-4 text-sm leading-7 text-muted">{message}</p>
              <ButtonLink to="/dashboard" className="mt-6">
                Go to dashboard
              </ButtonLink>
            </div>
          )}
          {state === 'error' && (
            <div className="text-center">
              <CircleAlert className="mx-auto h-10 w-10 text-rose-300" />
              <p className="mt-4 text-sm leading-7 text-muted">{message}</p>
              <p className="mt-2 text-xs text-muted">
                Verification links expire after 24 hours. Sign in and request a new link from your profile.
              </p>
              <div className="mt-6 flex justify-center gap-2">
                <ButtonLink to="/login" variant="secondary">
                  Sign in
                </ButtonLink>
                <ButtonLink to="/dashboard/profile">Open profile</ButtonLink>
              </div>
            </div>
          )}
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
          <MailCheck className="h-3.5 w-3.5" /> Check your spam folder if the email does not arrive.
        </p>
      </AuthShell>
    </>
  );
}
