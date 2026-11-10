import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { apiErrorMessage } from '@/lib/api';
import { SEO } from '@/components/seo/SEO';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = (location.state as { from?: string } | null)?.from;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
      navigate(from || (user.role === 'ADMIN' ? '/admin' : '/dashboard'), { replace: true });
    } catch (submitError) {
      setError(apiErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Sign in" path="/login" noIndex />
      <AuthShell
        title="Welcome back"
        subtitle="Sign in to continue your learning journey."
        footer={
          <p>
            New to TechTuxAcademy?{' '}
            <Link to="/register" className="font-semibold text-brand-300 hover:text-brand-200">
              Create an account
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
            label="Email address"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
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
          <div className="flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-muted transition hover:text-text">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            <LogIn className="h-4 w-4" />
            Sign in
          </Button>
        </form>

        <GoogleButton onSuccess={() => navigate(from || '/dashboard', { replace: true })} />
      </AuthShell>
    </>
  );
}
