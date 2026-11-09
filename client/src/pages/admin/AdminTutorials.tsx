import { useEffect, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Plus, ScrollText, Trash2 } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import type { Category, Pagination, Tutorial } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { SEO } from '@/components/seo/SEO';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/Input';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  AdminEmpty,
  AdminHeader,
  AdminPager,
  AdminSearch,
  TableWrap,
  Td,
  Th,
} from '@/components/admin/AdminUI';

interface TutorialsResponse {
  tutorials: Tutorial[];
  pagination: Pagination;
}

const emptyForm = {
  title: '',
  titleTe: '',
  slug: '',
  excerpt: '',
  excerptTe: '',
  content: '',
  contentTe: '',
  image: '',
  categoryId: '',
  published: false,
  featured: false,
  readMinutes: 5,
  language: 'en' as 'en' | 'te',
  tags: '',
};

function splitTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function AdminTutorials() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tutorial | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Tutorial | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-tutorials', search, page],
    queryFn: async () => {
      const { data } = await api.get<TutorialsResponse>('/tutorials/admin/all', {
        params: { search, page, limit: 12 },
      });
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await api.get<{ categories: Category[] }>('/categories/admin/all');
      return data.categories;
    },
  });

  const detailQuery = useQuery({
    queryKey: ['admin-tutorial', editing?.id],
    queryFn: async () => {
      const { data } = await api.get<{ tutorial: Tutorial }>(`/tutorials/admin/${editing?.id}`);
      return data.tutorial;
    },
    enabled: Boolean(editing?.id),
  });

  useEffect(() => {
    const tutorial = detailQuery.data;
    if (!tutorial) return;
    setForm({
      title: tutorial.title,
      titleTe: tutorial.titleTe || '',
      slug: tutorial.slug,
      excerpt: tutorial.excerpt,
      excerptTe: tutorial.excerptTe || '',
      content: tutorial.content || '',
      contentTe: tutorial.contentTe || '',
      image: tutorial.image || '',
      categoryId: tutorial.categoryId || '',
      published: Boolean(tutorial.published),
      featured: Boolean(tutorial.featured),
      readMinutes: tutorial.readMinutes || 5,
      language: (tutorial.language as 'en' | 'te') || 'en',
      tags: (tutorial.tags || []).join(', '),
    });
  }, [detailQuery.data]);

  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (tutorial: Tutorial) => {
    setEditing(tutorial);
    setForm({
      title: tutorial.title,
      titleTe: tutorial.titleTe || '',
      slug: tutorial.slug,
      excerpt: tutorial.excerpt,
      excerptTe: tutorial.excerptTe || '',
      content: '',
      contentTe: '',
      image: tutorial.image || '',
      categoryId: tutorial.categoryId || '',
      published: Boolean(tutorial.published),
      featured: Boolean(tutorial.featured),
      readMinutes: tutorial.readMinutes || 5,
      language: (tutorial.language as 'en' | 'te') || 'en',
      tags: (tutorial.tags || []).join(', '),
    });
    setFormError('');
    setModalOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        titleTe: form.titleTe || null,
        slug: form.slug || undefined,
        excerpt: form.excerpt,
        excerptTe: form.excerptTe || null,
        content: form.content,
        contentTe: form.contentTe || null,
        image: form.image || null,
        categoryId: form.categoryId,
        published: form.published,
        featured: form.featured,
        readMinutes: Number(form.readMinutes) || 5,
        language: form.language,
        tags: splitTags(form.tags),
      };
      if (editing) {
        const { data } = await api.put<{ tutorial: Tutorial; message: string }>(
          `/tutorials/admin/${editing.id}`,
          payload
        );
        return data;
      }
      const { data } = await api.post<{ tutorial: Tutorial; message: string }>(
        '/tutorials/admin/create',
        payload
      );
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      setModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-tutorials'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['site-home'] });
      void queryClient.invalidateQueries({ queryKey: ['tutorials'] });
    },
    onError: (error) => setFormError(apiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ message: string }>(`/tutorials/admin/${id}`);
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-tutorials'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <>
      <SEO title="Manage tutorials" noIndex />
      <AdminHeader
        title="Tutorials"
        description="Write and publish long-form tutorials. Markdown is supported in the content body."
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New tutorial
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search tutorials by title or slug…"
        />
      </div>

      {isLoading ? (
        <PageLoader label="Loading tutorials…" />
      ) : isError || !data ? (
        <ErrorState title="Could not load tutorials" onRetry={() => refetch()} />
      ) : data.tutorials.length === 0 ? (
        <AdminEmpty>
          <ScrollText className="mx-auto mb-3 h-8 w-8 text-brand-300/70" />
          No tutorials match this view.
        </AdminEmpty>
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr>
                <Th>Tutorial</Th>
                <Th>Category</Th>
                <Th>Read time</Th>
                <Th>Status</Th>
                <Th>Updated</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {data.tutorials.map((tutorial) => (
                <tr key={tutorial.id} className="transition hover:bg-line/5">
                  <Td>
                    <div className="min-w-[240px]">
                      <p className="font-medium text-text">{tutorial.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted">/{tutorial.slug}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {tutorial.featured && <Badge tone="amber">Featured</Badge>}
                        {tutorial.language === 'te' && <Badge tone="cyan">Telugu</Badge>}
                      </div>
                    </div>
                  </Td>
                  <Td>{tutorial.category?.name || '—'}</Td>
                  <Td className="whitespace-nowrap text-xs">{tutorial.readMinutes} min</Td>
                  <Td>
                    <Badge tone={tutorial.published ? 'green' : 'amber'}>
                      {tutorial.published ? 'Published' : 'Draft'}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-xs">{formatDate(tutorial.updatedAt || tutorial.createdAt)}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label="Edit tutorial" onClick={() => openEdit(tutorial)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-rose-300 hover:bg-rose-500/10"
                        aria-label="Delete tutorial"
                        onClick={() => setPendingDelete(tutorial)}
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit tutorial' : 'New tutorial'}
        description="Tutorials use markdown. Set a category, excerpt and content body."
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={save.isPending} onClick={() => save.mutate()}>
              {editing ? 'Save tutorial' : 'Create tutorial'}
            </Button>
          </>
        }
      >
        {detailQuery.isLoading && editing ? (
          <PageLoader label="Loading tutorial…" />
        ) : (
          <div className="space-y-4">
            {formError && (
              <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {formError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Title (English)" required value={form.title} onChange={update('title')} />
              <Input label="Title (Telugu)" value={form.titleTe} onChange={update('titleTe')} placeholder="తెలుగు శీర్షిక" />
            </div>
            <Input
              label="Slug"
              value={form.slug}
              onChange={update('slug')}
              placeholder="auto-generated-from-title"
              hint="Leave blank to generate from the title."
            />
            <Textarea
              label="Excerpt (English)"
              required
              rows={2}
              maxLength={500}
              value={form.excerpt}
              onChange={update('excerpt')}
              hint={`${form.excerpt.length}/500 characters`}
            />
            <Textarea label="Excerpt (Telugu)" rows={2} maxLength={600} value={form.excerptTe} onChange={update('excerptTe')} />
            <Textarea
              label="Content (English, markdown)"
              required
              rows={10}
              value={form.content}
              onChange={update('content')}
            />
            <Textarea label="Content (Telugu, markdown)" rows={6} value={form.contentTe} onChange={update('contentTe')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Category" required value={form.categoryId} onChange={update('categoryId')}>
                <option value="">Choose a category</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Select label="Language" value={form.language} onChange={update('language')}>
                <option value="en">English</option>
                <option value="te">Telugu</option>
              </Select>
              <Input
                label="Read time (minutes)"
                type="number"
                min={1}
                max={300}
                value={form.readMinutes}
                onChange={update('readMinutes')}
              />
              <Input label="Cover image URL" value={form.image} onChange={update('image')} placeholder="https://…" />
            </div>
            <Input
              label="Tags (comma separated)"
              value={form.tags}
              onChange={update('tags')}
              placeholder="linux, terminal, beginner"
            />
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
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        title="Delete this tutorial?"
        description={`“${pendingDelete?.title || ''}” will be permanently deleted.`}
        confirmLabel="Delete tutorial"
        loading={remove.isPending}
      />
    </>
  );
}
