import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Check,
  Mail,
  MessageSquare,
  Plus,
  Quote,
  Save,
  Trash2,
  Undo2,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import type {
  Announcement,
  Pagination,
  SiteSettings,
  Testimonial,
} from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { SEO } from '@/components/seo/SEO';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/Input';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { AdminEmpty, AdminHeader, AdminPager, AdminSection, TableWrap, Td, Th } from '@/components/admin/AdminUI';

type TabId = 'content' | 'contact' | 'announcements' | 'testimonials' | 'newsletter' | 'messages';

const tabs: { id: TabId; label: string }[] = [
  { id: 'content', label: 'Homepage & about' },
  { id: 'contact', label: 'Contact & social' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'messages', label: 'Inbox' },
];

const contentFields: { key: string; label: string; textarea?: boolean; rows?: number }[] = [
  { key: 'siteName', label: 'Site name' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'domain', label: 'Domain' },
  { key: 'heroEyebrow', label: 'Hero eyebrow' },
  { key: 'heroTitle', label: 'Hero title' },
  { key: 'heroHighlight', label: 'Hero highlighted text' },
  { key: 'heroDescription', label: 'Hero description', textarea: true, rows: 3 },
  { key: 'heroPrimaryCta', label: 'Primary CTA label' },
  { key: 'heroSecondaryCta', label: 'Secondary CTA label' },
  { key: 'aboutTitle', label: 'About title' },
  { key: 'aboutDescription', label: 'About description', textarea: true, rows: 4 },
  { key: 'aboutMission', label: 'About mission', textarea: true, rows: 4 },
  { key: 'certificateAuthority', label: 'Certificate authority name' },
];

const contactFields: { key: string; label: string; textarea?: boolean; rows?: number }[] = [
  { key: 'contactEmail', label: 'Contact email' },
  { key: 'contactPhone', label: 'Contact phone' },
  { key: 'contactAddress', label: 'Contact address' },
  { key: 'socialTwitter', label: 'Twitter / X URL' },
  { key: 'socialGithub', label: 'GitHub URL' },
  { key: 'socialLinkedin', label: 'LinkedIn URL' },
  { key: 'socialYoutube', label: 'YouTube URL' },
  { key: 'newsletterTitle', label: 'Newsletter title' },
  { key: 'newsletterDescription', label: 'Newsletter description', textarea: true, rows: 3 },
  { key: 'footerNote', label: 'Footer note', textarea: true, rows: 3 },
];

export default function AdminWebsite() {
  const [tab, setTab] = useState<TabId>('content');
  return (
    <>
      <SEO title="Website settings" noIndex />
      <AdminHeader
        title="Website"
        description="Edit the public homepage, contact details, announcements, testimonials and the support inbox."
      />
      <Tabs items={tabs} value={tab} onChange={(id) => setTab(id as TabId)} className="mb-6" />
      {tab === 'content' && <SettingsForm fields={contentFields} title="Homepage & about" />}
      {tab === 'contact' && <SettingsForm fields={contactFields} title="Contact & social" />}
      {tab === 'announcements' && <AnnouncementsManager />}
      {tab === 'testimonials' && <TestimonialsManager />}
      {tab === 'newsletter' && <NewsletterManager />}
      {tab === 'messages' && <MessagesManager />}
    </>
  );
}

function SettingsForm({
  fields,
  title,
}: {
  fields: { key: string; label: string; textarea?: boolean; rows?: number }[];
  title: string;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await api.get<{ settings: SiteSettings }>('/admin/settings');
      return data.settings;
    },
  });

  useEffect(() => {
    if (!data) return;
    const next: Record<string, string> = {};
    for (const field of fields) {
      const value = data[field.key];
      next[field.key] = value === null || value === undefined ? '' : String(value);
    }
    setForm(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { data } = await api.put<{ settings: SiteSettings; message: string }>('/admin/settings', form);
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      void queryClient.invalidateQueries({ queryKey: ['site-home'] });
      void queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  if (isLoading) return <PageLoader label="Loading settings…" />;
  if (isError) return <ErrorState title="Could not load settings" onRetry={() => refetch()} />;

  const update = (key: string) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <form onSubmit={submit}>
      <AdminSection
        title={title}
        description="These values are read live by the public site. Empty fields fall back to sensible defaults."
        action={
          <Button type="submit" size="sm" loading={save.isPending}>
            <Save className="h-4 w-4" /> Save changes
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) =>
            field.textarea ? (
              <Textarea
                key={field.key}
                className="md:col-span-2"
                label={field.label}
                rows={field.rows || 3}
                value={form[field.key] ?? ''}
                onChange={update(field.key)}
              />
            ) : (
              <Input
                key={field.key}
                label={field.label}
                value={form[field.key] ?? ''}
                onChange={update(field.key)}
              />
            )
          )}
        </div>
      </AdminSection>
    </form>
  );
}

const emptyAnnouncement = {
  title: '',
  message: '',
  messageTe: '',
  type: 'info' as Announcement['type'],
  active: true,
  link: '',
};

function AnnouncementsManager() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ ...emptyAnnouncement });
  const [formError, setFormError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data } = await api.get<{ announcements: Announcement[] }>('/admin/announcements');
      return data.announcements;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        message: form.message,
        messageTe: form.messageTe || null,
        type: form.type,
        active: form.active,
        link: form.link || null,
      };
      if (editing) {
        const { data } = await api.put<{ message: string }>(`/admin/announcements/${editing.id}`, payload);
        return data;
      }
      const { data } = await api.post<{ message: string }>('/admin/announcements', payload);
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      setModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      void queryClient.invalidateQueries({ queryKey: ['site-home'] });
    },
    onError: (error) => setFormError(apiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ message: string }>(`/admin/announcements/${id}`);
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      void queryClient.invalidateQueries({ queryKey: ['site-home'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyAnnouncement });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (announcement: Announcement) => {
    setEditing(announcement);
    setForm({
      title: announcement.title,
      message: announcement.message,
      messageTe: announcement.messageTe || '',
      type: announcement.type,
      active: announcement.active,
      link: announcement.link || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  if (isLoading) return <PageLoader label="Loading announcements…" />;
  if (isError || !data) return <ErrorState title="Could not load announcements" onRetry={() => refetch()} />;

  return (
    <AdminSection
      title="Announcements"
      description="Active announcements appear in the site-wide banner."
      action={
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New announcement
        </Button>
      }
    >
      {data.length === 0 ? (
        <AdminEmpty>
          <Bell className="mx-auto mb-2 h-7 w-7 text-brand-300/70" />
          No announcements yet.
        </AdminEmpty>
      ) : (
        <ul className="space-y-3">
          {data.map((announcement) => (
            <li key={announcement.id} className="rounded-xl border border-line/10 bg-surface/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-text">{announcement.title}</p>
                    <Badge tone={announcement.active ? 'green' : 'neutral'}>
                      {announcement.active ? 'Active' : 'Hidden'}
                    </Badge>
                    <Badge tone="cyan">{announcement.type}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{announcement.message}</p>
                  <p className="mt-1 text-[11px] text-muted">{formatDate(announcement.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(announcement)}>
                    Edit
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-rose-300 hover:bg-rose-500/10"
                    aria-label="Delete announcement"
                    onClick={() => setPendingDelete(announcement)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit announcement' : 'New announcement'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={save.isPending} onClick={() => save.mutate()}>
              {editing ? 'Save announcement' : 'Publish announcement'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {formError}
            </div>
          )}
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
          <Textarea
            label="Message (English)"
            required
            rows={3}
            value={form.message}
            onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
          />
          <Textarea
            label="Message (Telugu)"
            rows={2}
            value={form.messageTe}
            onChange={(event) => setForm((current) => ({ ...current, messageTe: event.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            >
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="danger">Danger</option>
            </Select>
            <Input
              label="Link (optional)"
              value={form.link}
              onChange={(event) => setForm((current) => ({ ...current, link: event.target.value }))}
              placeholder="/courses"
            />
          </div>
          <Checkbox
            label="Active"
            checked={form.active}
            onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        title="Delete this announcement?"
        description="It will be removed from the public banner."
        confirmLabel="Delete announcement"
        loading={remove.isPending}
      />
    </AdminSection>
  );
}

const emptyTestimonial = {
  name: '',
  role: '',
  quote: '',
  quoteTe: '',
  avatar: '',
  rating: 5,
  featured: false,
  published: true,
  order: 0,
};

function TestimonialsManager() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState({ ...emptyTestimonial });
  const [formError, setFormError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Testimonial | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-testimonials'],
    queryFn: async () => {
      const { data } = await api.get<{ testimonials: Testimonial[] }>('/admin/testimonials');
      return data.testimonials;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        role: form.role,
        quote: form.quote,
        quoteTe: form.quoteTe || null,
        avatar: form.avatar || null,
        rating: Number(form.rating) || 5,
        featured: form.featured,
        published: form.published,
        order: Number(form.order) || 0,
      };
      if (editing) {
        const { data } = await api.put<{ message: string }>(`/admin/testimonials/${editing.id}`, payload);
        return data;
      }
      const { data } = await api.post<{ message: string }>('/admin/testimonials', payload);
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      setModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
      void queryClient.invalidateQueries({ queryKey: ['site-home'] });
    },
    onError: (error) => setFormError(apiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ message: string }>(`/admin/testimonials/${id}`);
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
      void queryClient.invalidateQueries({ queryKey: ['site-home'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyTestimonial });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (testimonial: Testimonial) => {
    setEditing(testimonial);
    setForm({
      name: testimonial.name,
      role: testimonial.role,
      quote: testimonial.quote,
      quoteTe: testimonial.quoteTe || '',
      avatar: testimonial.avatar || '',
      rating: testimonial.rating,
      featured: testimonial.featured,
      published: testimonial.published,
      order: testimonial.order,
    });
    setFormError('');
    setModalOpen(true);
  };

  if (isLoading) return <PageLoader label="Loading testimonials…" />;
  if (isError || !data) return <ErrorState title="Could not load testimonials" onRetry={() => refetch()} />;

  return (
    <AdminSection
      title="Testimonials"
      description="Published testimonials appear on the homepage."
      action={
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New testimonial
        </Button>
      }
    >
      {data.length === 0 ? (
        <AdminEmpty>
          <Quote className="mx-auto mb-2 h-7 w-7 text-brand-300/70" />
          No testimonials yet.
        </AdminEmpty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.map((testimonial) => (
            <li key={testimonial.id} className="rounded-xl border border-line/10 bg-surface/40 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-text">{testimonial.name}</p>
                  <p className="text-xs text-muted">{testimonial.role}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Badge tone={testimonial.published ? 'green' : 'neutral'}>
                    {testimonial.published ? 'Published' : 'Draft'}
                  </Badge>
                  {testimonial.featured && <Badge tone="amber">Featured</Badge>}
                </div>
              </div>
              <p className="mt-2 line-clamp-3 text-sm italic text-muted">“{testimonial.quote}”</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-amber-300">{'★'.repeat(testimonial.rating)}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(testimonial)}>
                    Edit
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-rose-300 hover:bg-rose-500/10"
                    aria-label="Delete testimonial"
                    onClick={() => setPendingDelete(testimonial)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit testimonial' : 'New testimonial'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={save.isPending} onClick={() => save.mutate()}>
              {editing ? 'Save testimonial' : 'Create testimonial'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {formError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <Input
              label="Role / title"
              required
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
              placeholder="Student, Full-stack developer"
            />
          </div>
          <Textarea
            label="Quote (English)"
            required
            rows={3}
            value={form.quote}
            onChange={(event) => setForm((current) => ({ ...current, quote: event.target.value }))}
          />
          <Textarea
            label="Quote (Telugu)"
            rows={2}
            value={form.quoteTe}
            onChange={(event) => setForm((current) => ({ ...current, quoteTe: event.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Rating (1–5)"
              type="number"
              min={1}
              max={5}
              value={form.rating}
              onChange={(event) => setForm((current) => ({ ...current, rating: Number(event.target.value) }))}
            />
            <Input
              label="Order"
              type="number"
              min={0}
              max={999}
              value={form.order}
              onChange={(event) => setForm((current) => ({ ...current, order: Number(event.target.value) }))}
            />
            <Input
              label="Avatar URL"
              value={form.avatar}
              onChange={(event) => setForm((current) => ({ ...current, avatar: event.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-6">
            <Checkbox
              label="Published"
              checked={form.published}
              onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))}
            />
            <Checkbox
              label="Featured"
              checked={form.featured}
              onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        title="Delete this testimonial?"
        description="It will be removed from the homepage."
        confirmLabel="Delete testimonial"
        loading={remove.isPending}
      />
    </AdminSection>
  );
}

interface Subscriber {
  id: string;
  email: string;
  name?: string | null;
  active: boolean;
  createdAt: string;
}

function NewsletterManager() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-newsletter', page],
    queryFn: async () => {
      const { data } = await api.get<{ subscribers: Subscriber[]; pagination: Pagination }>('/admin/newsletter', {
        params: { page, limit: 20 },
      });
      return data;
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data } = await api.patch<{ message: string }>(`/admin/newsletter/${id}`, { active });
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: ['admin-newsletter'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ message: string }>(`/admin/newsletter/${id}`);
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: ['admin-newsletter'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  if (isLoading) return <PageLoader label="Loading subscribers…" />;
  if (isError || !data) return <ErrorState title="Could not load subscribers" onRetry={() => refetch()} />;

  return (
    <AdminSection
      title="Newsletter subscribers"
      description="Subscribers collected from the public newsletter form."
    >
      {data.subscribers.length === 0 ? (
        <AdminEmpty>
          <Mail className="mx-auto mb-2 h-7 w-7 text-brand-300/70" />
          No subscribers yet.
        </AdminEmpty>
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr>
                <Th>Email</Th>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Subscribed</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {data.subscribers.map((subscriber) => (
                <tr key={subscriber.id} className="transition hover:bg-line/5">
                  <Td className="font-medium text-text">{subscriber.email}</Td>
                  <Td>{subscriber.name || '—'}</Td>
                  <Td>
                    <Badge tone={subscriber.active ? 'green' : 'neutral'}>
                      {subscriber.active ? 'Active' : 'Unsubscribed'}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-xs">{formatDate(subscriber.createdAt)}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggle.mutate({ id: subscriber.id, active: !subscriber.active })}
                      >
                        {subscriber.active ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        {subscriber.active ? 'Unsubscribe' : 'Reactivate'}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-rose-300 hover:bg-rose-500/10"
                        aria-label="Remove subscriber"
                        onClick={() => remove.mutate(subscriber.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <AdminPager pagination={data.pagination} onPageChange={setPage} />
        </>
      )}
    </AdminSection>
  );
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  handled: boolean;
  createdAt: string;
}

function MessagesManager() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-messages', status, page],
    queryFn: async () => {
      const { data } = await api.get<{ messages: ContactMessage[]; pagination: Pagination }>('/admin/messages', {
        params: { status, page, limit: 15 },
      });
      return data;
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, handled }: { id: string; handled: boolean }) => {
      const { data } = await api.patch<{ message: string }>(`/admin/messages/${id}`, { handled });
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ message: string }>(`/admin/messages/${id}`);
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <AdminSection
      title="Contact inbox"
      description="Messages submitted through the public contact form."
      action={
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="Filter messages"
          className="input-base w-full cursor-pointer sm:w-44"
        >
          <option value="">All messages</option>
          <option value="open">Open</option>
          <option value="handled">Handled</option>
        </select>
      }
    >
      {isLoading ? (
        <PageLoader label="Loading messages…" />
      ) : isError || !data ? (
        <ErrorState title="Could not load messages" onRetry={() => refetch()} />
      ) : data.messages.length === 0 ? (
        <AdminEmpty>
          <MessageSquare className="mx-auto mb-2 h-7 w-7 text-brand-300/70" />
          No messages match this view.
        </AdminEmpty>
      ) : (
        <>
          <ul className="space-y-3">
            {data.messages.map((message) => (
              <li key={message.id} className="rounded-xl border border-line/10 bg-surface/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-text">{message.subject}</p>
                      <Badge tone={message.handled ? 'green' : 'amber'}>
                        {message.handled ? 'Handled' : 'Open'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {message.name} · {message.email} · {formatDate(message.createdAt)}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm text-muted">{message.message}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggle.mutate({ id: message.id, handled: !message.handled })}
                    >
                      {message.handled ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      {message.handled ? 'Reopen' : 'Mark handled'}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-rose-300 hover:bg-rose-500/10"
                      aria-label="Delete message"
                      onClick={() => remove.mutate(message.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <AdminPager pagination={data.pagination} onPageChange={setPage} />
        </>
      )}
    </AdminSection>
  );
}
