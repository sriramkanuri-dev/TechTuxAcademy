import { useState, type FormEvent } from 'react';
import { Mail, Send } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function NewsletterForm({ className, compact }: { className?: string; compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { data } = await api.post<{ message: string }>('/newsletter', { email });
      setDone(true);
      setEmail('');
      toast.success(data.message);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className={cn('flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200', className)}>
        <Mail className="h-4 w-4" />
        You are subscribed. Welcome to the community!
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={cn('flex flex-col gap-2 sm:flex-row', className)}>
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        aria-label="Email address"
        className="input-base sm:flex-1"
      />
      <Button type="submit" loading={loading} className={compact ? 'px-4' : ''}>
        <Send className="h-4 w-4" />
        Subscribe
      </Button>
    </form>
  );
}
