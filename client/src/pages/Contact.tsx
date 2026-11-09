import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { SEO } from '@/components/seo/SEO';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';

interface SettingsResponse {
  settings: Record<string, unknown>;
}

export default function Contact() {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const { data } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data } = await api.get<SettingsResponse>('/site/settings');
      return data.settings;
    },
  });

  const setting = (key: string, fallback: string) =>
    typeof data?.[key] === 'string' && (data[key] as string).trim() ? (data[key] as string) : fallback;

  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data: response } = await api.post<{ message: string }>('/contact', form);
      toast.success(response.message);
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (submitError) {
      setError(apiErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Contact"
        description="Contact the TechTuxAcademy team about courses, certificates, partnerships or technical support."
        path="/contact"
      />
      <PageHeader
        eyebrow="Contact"
        title="Let's talk about what you want to learn"
        description="Questions about a course, a certificate or a partnership? Send a message and our team will reply within one to two business days."
        breadcrumb={[{ label: 'Contact' }]}
      />

      <section className="section container-page grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          {[
            { icon: Mail, label: 'Email', value: setting('contactEmail', 'hello@techtuxacademy.online'), href: `mailto:${setting('contactEmail', 'hello@techtuxacademy.online')}` },
            { icon: Phone, label: 'Phone', value: setting('contactPhone', '+91 90000 00000'), href: `tel:${setting('contactPhone', '+91 90000 00000').replace(/\s/g, '')}` },
            { icon: MapPin, label: 'Location', value: setting('contactAddress', 'Hyderabad, Telangana, India') },
            { icon: Clock, label: 'Response time', value: 'Within 1–2 business days' },
          ].map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="card-surface flex items-start gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-400/25 bg-brand-500/10">
                <Icon className="h-5 w-5 text-brand-300" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
                {href ? (
                  <a href={href} className="mt-1 block text-sm font-medium text-text transition hover:text-brand-200">
                    {value}
                  </a>
                ) : (
                  <p className="mt-1 text-sm font-medium text-text">{value}</p>
                )}
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-brand-400/20 bg-brand-500/5 p-5 text-sm leading-7 text-muted">
            <MessageSquare className="mb-2 h-5 w-5 text-brand-300" />
            For certificate verification, use the{' '}
            <a href="/verify-certificate" className="font-medium text-brand-300 hover:text-brand-200">
              public verification page
            </a>{' '}
            — it is instant and does not require an account.
          </div>
        </div>

        <div className="card-surface p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold text-text">Send us a message</h2>
          <p className="mt-1 text-sm text-muted">All fields are required.</p>

          {sent ? (
            <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-sm leading-7 text-emerald-100">
              <p className="font-semibold">Message received.</p>
              <p className="mt-1 text-emerald-200/80">
                Thank you for reaching out. Our team will reply to the email address you provided.
              </p>
              <Button variant="secondary" className="mt-5" onClick={() => setSent(false)}>
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              {error && (
                <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Your name"
                  required
                  minLength={2}
                  value={form.name}
                  onChange={update('name')}
                  placeholder="Your name"
                />
                <Input
                  label="Email address"
                  type="email"
                  required
                  value={form.email}
                  onChange={update('email')}
                  placeholder="you@example.com"
                />
              </div>
              <Input
                label="Subject"
                required
                minLength={3}
                value={form.subject}
                onChange={update('subject')}
                placeholder="How can we help?"
              />
              <Textarea
                label="Message"
                required
                minLength={10}
                rows={7}
                value={form.message}
                onChange={update('message')}
                placeholder="Tell us what you are working on or what you need help with."
              />
              <Button type="submit" size="lg" loading={loading}>
                <Send className="h-4 w-4" />
                Send message
              </Button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
