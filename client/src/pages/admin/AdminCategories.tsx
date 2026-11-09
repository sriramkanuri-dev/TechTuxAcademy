import { useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, FolderTree, Plus, Trash2 } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import type { Category } from '@/lib/types';
import { useToast } from '@/contexts/ToastContext';
import { SEO } from '@/components/seo/SEO';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Checkbox, Input, Textarea } from '@/components/ui/Input';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { AdminEmpty, AdminHeader, TableWrap, Td, Th } from '@/components/admin/AdminUI';

const iconOptions = [
  'Terminal',
  'ServerCog',
  'Boxes',
  'BadgeCheck',
  'CircleDot',
  'Code2',
  'Braces',
  'Coffee',
  'Binary',
  'Globe2',
  'LayoutTemplate',
  'Layers',
  'Sparkles',
  'BrainCircuit',
  'Cpu',
  'Radio',
  'CircuitBoard',
  'Bot',
  'CloudCog',
  'ShieldCheck',
];

const emptyForm = {
  name: '',
  nameTe: '',
  slug: '',
  description: '',
  descriptionTe: '',
  icon: 'Cpu',
  color: '#8b5cf6',
  order: 0,
  featured: false,
};

export default function AdminCategories() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await api.get<{ categories: Category[] }>('/categories/admin/all');
      return data.categories;
    },
  });

  const update =
    (key: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({
      name: category.name,
      nameTe: category.nameTe || '',
      slug: category.slug,
      description: category.description,
      descriptionTe: category.descriptionTe || '',
      icon: category.icon || 'Cpu',
      color: category.color || '#8b5cf6',
      order: category.order || 0,
      featured: Boolean(category.featured),
    });
    setFormError('');
    setModalOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        nameTe: form.nameTe || null,
        slug: form.slug || undefined,
        description: form.description,
        descriptionTe: form.descriptionTe || null,
        icon: form.icon,
        color: form.color,
        order: Number(form.order) || 0,
        featured: form.featured,
      };
      if (editing) {
        const { data } = await api.put<{ category: Category; message: string }>(
          `/categories/admin/${editing.id}`,
          payload
        );
        return data;
      }
      const { data } = await api.post<{ category: Category; message: string }>('/categories/admin', payload);
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      setModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      void queryClient.invalidateQueries({ queryKey: ['site-home'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => setFormError(apiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ message: string }>(`/categories/admin/${id}`);
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <>
      <SEO title="Manage categories" noIndex />
      <AdminHeader
        title="Categories"
        description="Categories group courses, tutorials and articles. Icons and colours appear across the public site."
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New category
          </Button>
        }
      />

      {isLoading ? (
        <PageLoader label="Loading categories…" />
      ) : isError || !data ? (
        <ErrorState title="Could not load categories" onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <AdminEmpty>
          <FolderTree className="mx-auto mb-3 h-8 w-8 text-brand-300/70" />
          No categories yet.
        </AdminEmpty>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Category</Th>
              <Th>Courses</Th>
              <Th>Tutorials</Th>
              <Th>Articles</Th>
              <Th>Order</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((category) => (
              <tr key={category.id} className="transition hover:bg-line/5">
                <Td>
                  <div className="flex items-center gap-3">
                    <CategoryIcon name={category.icon} color={category.color} className="h-9 w-9" />
                    <div className="min-w-0">
                      <p className="font-medium text-text">{category.name}</p>
                      <p className="text-xs text-muted">/{category.slug}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {category.nameTe && <Badge tone="cyan">తెలుగు</Badge>}
                        {category.featured && <Badge tone="amber">Featured</Badge>}
                      </div>
                    </div>
                  </div>
                </Td>
                <Td className="text-xs">{category._count?.courses ?? 0}</Td>
                <Td className="text-xs">{category._count?.tutorials ?? 0}</Td>
                <Td className="text-xs">{category._count?.posts ?? 0}</Td>
                <Td className="text-xs">{category.order ?? 0}</Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" aria-label="Edit category" onClick={() => openEdit(category)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-rose-300 hover:bg-rose-500/10"
                      aria-label="Delete category"
                      onClick={() => setPendingDelete(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit category' : 'New category'}
        description="Name, description, icon and colour are used across the catalogue."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={save.isPending} onClick={() => save.mutate()}>
              {editing ? 'Save category' : 'Create category'}
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
          <div className="flex items-center gap-4">
            <CategoryIcon name={form.icon} color={form.color} className="h-12 w-12" />
            <div>
              <p className="text-sm font-semibold text-text">Preview</p>
              <p className="text-xs text-muted">Icon and colour shown on category cards.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name (English)" required value={form.name} onChange={update('name')} />
            <Input label="Name (Telugu)" value={form.nameTe} onChange={update('nameTe')} placeholder="తెలుగు పేరు" />
          </div>
          <Input
            label="Slug"
            value={form.slug}
            onChange={update('slug')}
            placeholder="auto-generated-from-name"
            hint="Leave blank to generate from the name."
          />
          <Textarea
            label="Description (English)"
            required
            rows={3}
            minLength={10}
            maxLength={2000}
            value={form.description}
            onChange={update('description')}
          />
          <Textarea label="Description (Telugu)" rows={2} maxLength={2000} value={form.descriptionTe} onChange={update('descriptionTe')} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label-base" htmlFor="category-icon">
                Icon
              </label>
              <select
                id="category-icon"
                value={form.icon}
                onChange={update('icon')}
                className="input-base cursor-pointer"
              >
                {iconOptions.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-base" htmlFor="category-color">
                Colour
              </label>
              <input
                id="category-color"
                type="color"
                value={form.color}
                onChange={update('color')}
                className="h-10 w-full cursor-pointer rounded-xl border border-line/10 bg-surface px-1"
              />
            </div>
            <Input
              label="Order"
              type="number"
              min={0}
              max={999}
              value={form.order}
              onChange={update('order')}
            />
          </div>
          <Checkbox
            label="Featured category"
            checked={form.featured}
            onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        title="Delete this category?"
        description={`“${pendingDelete?.name || ''}” can only be deleted when it has no courses, tutorials or articles.`}
        confirmLabel="Delete category"
        loading={remove.isPending}
      />
    </>
  );
}
