import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  ExternalLink,
  Plus,
  Save,
  Trash2,
  Video,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import type { Category, Course, Lesson } from '@/lib/types';
import { useToast } from '@/contexts/ToastContext';
import { SEO } from '@/components/seo/SEO';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/Input';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { AdminHeader, AdminSection, AdminEmpty } from '@/components/admin/AdminUI';

interface AdminCourse extends Omit<Course, '_count'> {
  category: Category;
  instructor: { id: string; name: string; email: string };
  lessons: Lesson[];
  _count: { lessons: number; enrollments: number; certificates: number };
}

interface InstructorOption {
  id: string;
  name: string;
  email: string;
}

const emptyCourse = {
  title: '',
  titleTe: '',
  slug: '',
  description: '',
  descriptionTe: '',
  longDescription: '',
  longDescriptionTe: '',
  thumbnail: '',
  difficulty: 'BEGINNER',
  language: 'en',
  certificateThreshold: 100,
  categoryId: '',
  instructorId: '',
  published: false,
  featured: false,
  tags: '',
  objectives: '',
  objectivesTe: '',
  requirements: '',
};

const emptyLesson = {
  title: '',
  titleTe: '',
  description: '',
  youtubeUrl: '',
  durationMinutes: 0,
  isPreview: false,
  resourcesText: '',
};

function splitLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function AdminCourseEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...emptyCourse });
  const [error, setError] = useState('');
  const [lessonModal, setLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState({ ...emptyLesson });
  const [lessonError, setLessonError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Lesson | null>(null);

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await api.get<{ categories: Category[] }>('/categories/admin/all');
      return data.categories;
    },
  });

  const { data: instructorsData } = useQuery({
    queryKey: ['admin-instructors'],
    queryFn: async () => {
      const { data } = await api.get<{ instructors: InstructorOption[] }>('/admin/instructors');
      return data.instructors;
    },
  });

  const courseQuery = useQuery({
    queryKey: ['admin-course', id],
    queryFn: async () => {
      const { data } = await api.get<{ course: AdminCourse }>(`/courses/admin/${id}`);
      return data.course;
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!courseQuery.data) return;
    const course = courseQuery.data;
    setForm({
      title: course.title,
      titleTe: course.titleTe || '',
      slug: course.slug,
      description: course.description,
      descriptionTe: course.descriptionTe || '',
      longDescription: course.longDescription || '',
      longDescriptionTe: course.longDescriptionTe || '',
      thumbnail: course.thumbnail || '',
      difficulty: course.difficulty,
      language: course.language,
      certificateThreshold: course.certificateThreshold,
      categoryId: course.categoryId,
      instructorId: course.instructor?.id || '',
      published: course.published,
      featured: course.featured,
      tags: course.tags.join(', '),
      objectives: course.objectives.join('\n'),
      objectivesTe: course.objectivesTe.join('\n'),
      requirements: course.requirements.join('\n'),
    });
  }, [courseQuery.data]);

  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const payload = useMemo(
    () => ({
      title: form.title,
      titleTe: form.titleTe || null,
      slug: form.slug || undefined,
      description: form.description,
      descriptionTe: form.descriptionTe || null,
      longDescription: form.longDescription || null,
      longDescriptionTe: form.longDescriptionTe || null,
      thumbnail: form.thumbnail || null,
      difficulty: form.difficulty as Course['difficulty'],
      language: form.language as 'en' | 'te',
      certificateThreshold: Number(form.certificateThreshold),
      categoryId: form.categoryId,
      instructorId: form.instructorId || undefined,
      published: form.published,
      featured: form.featured,
      tags: splitTags(form.tags),
      objectives: splitLines(form.objectives),
      objectivesTe: splitLines(form.objectivesTe),
      requirements: splitLines(form.requirements),
    }),
    [form]
  );

  const saveCourse = useMutation({
    mutationFn: async () => {
      if (isNew) {
        const { data } = await api.post<{ course: AdminCourse; message: string }>('/courses/admin/create', payload);
        return data;
      }
      const { data } = await api.put<{ course: AdminCourse; message: string }>(`/courses/admin/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['site-home'] });
      if (isNew) navigate(`/admin/courses/${data.course.id}`, { replace: true });
      else void queryClient.invalidateQueries({ queryKey: ['admin-course', id] });
    },
    onError: (mutationError) => setError(apiErrorMessage(mutationError)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    saveCourse.mutate();
  };

  const openNewLesson = () => {
    setEditingLesson(null);
    setLessonForm({ ...emptyLesson, durationMinutes: 0 });
    setLessonError('');
    setLessonModal(true);
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      titleTe: lesson.titleTe || '',
      description: lesson.description || '',
      youtubeUrl: lesson.youtubeUrl,
      durationMinutes: lesson.durationMinutes,
      isPreview: lesson.isPreview,
      resourcesText: (lesson.resources || []).map((resource) => `${resource.title} | ${resource.url}`).join('\n'),
    });
    setLessonError('');
    setLessonModal(true);
  };

  const saveLesson = useMutation({
    mutationFn: async () => {
      const resources = splitLines(lessonForm.resourcesText).map((line) => {
        const [title, url] = line.split('|').map((part) => part.trim());
        if (!title || !url) throw new Error('Each resource line must use the format: Title | https://example.com');
        return { title, url };
      });
      const body = {
        title: lessonForm.title,
        titleTe: lessonForm.titleTe || null,
        description: lessonForm.description || null,
        youtubeUrl: lessonForm.youtubeUrl,
        durationMinutes: Number(lessonForm.durationMinutes) || 0,
        isPreview: lessonForm.isPreview,
        resources,
      };
      if (editingLesson) {
        const { data } = await api.put<{ lesson: Lesson; message: string }>(`/courses/admin/lessons/${editingLesson.id}`, body);
        return data;
      }
      const { data } = await api.post<{ lesson: Lesson; message: string }>(`/courses/admin/${id}/lessons`, body);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setLessonModal(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-course', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
    onError: (mutationError) => setLessonError(apiErrorMessage(mutationError)),
  });

  const deleteLesson = useMutation({
    mutationFn: async (lessonId: string) => {
      const { data } = await api.delete<{ message: string }>(`/courses/admin/lessons/${lessonId}`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-course', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
    onError: (mutationError) => toast.error(apiErrorMessage(mutationError)),
  });

  const reorder = useMutation({
    mutationFn: async (lessonIds: string[]) => {
      const { data } = await api.patch<{ message: string }>(`/courses/admin/${id}/lessons/reorder`, { lessonIds });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      void queryClient.invalidateQueries({ queryKey: ['admin-course', id] });
    },
    onError: (mutationError) => toast.error(apiErrorMessage(mutationError)),
  });

  const moveLesson = (index: number, direction: -1 | 1) => {
    const lessons = courseQuery.data?.lessons || [];
    const target = index + direction;
    if (target < 0 || target >= lessons.length) return;
    const next = [...lessons];
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next.map((lesson) => lesson.id));
  };

  if (id && courseQuery.isLoading) return <PageLoader label="Loading course…" />;
  if (id && (courseQuery.isError || !courseQuery.data)) {
    return <ErrorState title="Course not found" description="This course may have been deleted." onRetry={() => courseQuery.refetch()} />;
  }

  const course = courseQuery.data;

  return (
    <>
      <SEO title={isNew ? 'New course' : `Edit: ${course?.title || 'Course'}`} noIndex />
      <div className="mb-4">
        <Link to="/admin/courses" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-text">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to courses
        </Link>
      </div>
      <AdminHeader
        title={isNew ? 'Create a course' : 'Edit course'}
        description={isNew ? 'Start with the core details. You can add lessons after saving.' : 'Update the course details, lessons and publishing state.'}
        action={
          course ? (
            <>
              <ButtonLink to={`/courses/${course.slug}`} size="sm" variant="secondary" target="_blank">
                <ExternalLink className="h-4 w-4" /> Public page
              </ButtonLink>
              <Badge tone={course.published ? 'green' : 'amber'} className="self-center">
                {course.published ? 'Published' : 'Draft'}
              </Badge>
            </>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <form onSubmit={submit} className="space-y-6">
          <AdminSection title="Course details">
            {error && (
              <div role="alert" className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Title (English)" required minLength={3} value={form.title} onChange={update('title')} />
              <Input label="Title (Telugu)" value={form.titleTe} onChange={update('titleTe')} placeholder="తెలుగు శీర్షిక" />
            </div>
            <Input
              className="mt-4"
              label="Slug"
              value={form.slug}
              onChange={update('slug')}
              placeholder="auto-generated-from-title"
              hint="Leave blank to generate from the title. Changing this breaks existing public links."
            />
            <Textarea
              className="mt-4"
              label="Short description (English)"
              required
              minLength={20}
              maxLength={600}
              rows={3}
              value={form.description}
              onChange={update('description')}
              hint={`${form.description.length}/600 characters`}
            />
            <Textarea
              className="mt-4"
              label="Short description (Telugu)"
              rows={3}
              maxLength={800}
              value={form.descriptionTe}
              onChange={update('descriptionTe')}
            />
            <Textarea
              className="mt-4"
              label="Long description (English, markdown)"
              rows={6}
              value={form.longDescription}
              onChange={update('longDescription')}
            />
            <Textarea
              className="mt-4"
              label="Long description (Telugu, markdown)"
              rows={5}
              value={form.longDescriptionTe}
              onChange={update('longDescriptionTe')}
            />
          </AdminSection>

          <AdminSection title="Classification">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Category" required value={form.categoryId} onChange={update('categoryId')}>
                <option value="">Choose a category</option>
                {categoriesData?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Select label="Instructor" value={form.instructorId} onChange={update('instructorId')}>
                <option value="">You (current admin)</option>
                {instructorsData?.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </option>
                ))}
              </Select>
              <Select label="Difficulty" value={form.difficulty} onChange={update('difficulty')}>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </Select>
              <Select label="Language" value={form.language} onChange={update('language')}>
                <option value="en">English</option>
                <option value="te">Telugu</option>
              </Select>
              <Input
                label="Certificate threshold (%)"
                type="number"
                min={1}
                max={100}
                value={form.certificateThreshold}
                onChange={update('certificateThreshold')}
                hint="Learners receive a certificate at this completion percentage."
              />
              <Input label="Thumbnail URL" value={form.thumbnail} onChange={update('thumbnail')} placeholder="https://…" />
            </div>
            <Textarea
              className="mt-4"
              label="Tags (comma separated)"
              rows={2}
              value={form.tags}
              onChange={update('tags')}
              placeholder="linux, terminal, beginner"
            />
            <Textarea
              className="mt-4"
              label="Learning objectives (one per line)"
              rows={4}
              value={form.objectives}
              onChange={update('objectives')}
            />
            <Textarea
              className="mt-4"
              label="Learning objectives — Telugu (one per line)"
              rows={3}
              value={form.objectivesTe}
              onChange={update('objectivesTe')}
            />
            <Textarea
              className="mt-4"
              label="Requirements (one per line)"
              rows={3}
              value={form.requirements}
              onChange={update('requirements')}
            />
            <div className="mt-4 flex flex-wrap gap-6">
              <Checkbox
                label="Published"
                checked={form.published}
                onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))}
              />
              <Checkbox
                label="Featured on homepage"
                checked={form.featured}
                onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))}
              />
            </div>
          </AdminSection>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={saveCourse.isPending}>
              <Save className="h-4 w-4" /> {isNew ? 'Create course' : 'Save changes'}
            </Button>
            <ButtonLink to="/admin/courses" variant="ghost" size="md">
              Cancel
            </ButtonLink>
          </div>
        </form>

        <aside className="space-y-6">
          {course && (
            <AdminSection
              title="Lessons"
              description={`${course.lessons.length} lessons · ${course._count.enrollments} learners`}
              action={
                <Button size="sm" onClick={openNewLesson}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              }
            >
              {course.lessons.length === 0 ? (
                <AdminEmpty>No lessons yet. Add the first video lesson.</AdminEmpty>
              ) : (
                <ol className="space-y-2">
                  {course.lessons.map((lesson, index) => (
                    <li key={lesson.id} className="rounded-xl border border-line/10 bg-surface/40 p-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line/15 bg-elevated text-[11px] font-semibold text-muted">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text">{lesson.title}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                            <Video className="h-3 w-3" /> {lesson.durationMinutes || 0} min
                            {lesson.isPreview && <Badge tone="cyan">Preview</Badge>}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Move lesson up"
                          disabled={index === 0 || reorder.isPending}
                          onClick={() => moveLesson(index, -1)}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Move lesson down"
                          disabled={index === course.lessons.length - 1 || reorder.isPending}
                          onClick={() => moveLesson(index, 1)}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditLesson(lesson)}>
                          Edit
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="ml-auto text-rose-300 hover:bg-rose-500/10"
                          aria-label="Delete lesson"
                          onClick={() => setPendingDelete(lesson)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </AdminSection>
          )}

          {!course && (
            <AdminSection title="Lessons">
              <AdminEmpty>
                <BookOpen className="mx-auto mb-2 h-7 w-7 text-brand-300/70" />
                Save the course first, then add lessons here.
              </AdminEmpty>
            </AdminSection>
          )}

          <div className="rounded-2xl border border-brand-400/20 bg-brand-500/5 p-5 text-sm leading-7 text-muted">
            <p className="font-semibold text-text">Video lessons</p>
            <p className="mt-1">
              Paste a standard YouTube watch or share URL. The platform extracts the video ID and embeds it via
              youtube-nocookie. Videos are never downloaded or re-hosted.
            </p>
          </div>
        </aside>
      </div>

      <Modal
        open={lessonModal}
        onClose={() => setLessonModal(false)}
        title={editingLesson ? 'Edit lesson' : 'Add lesson'}
        description="Lesson titles, video URL and resources. Duration updates the course total automatically."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLessonModal(false)}>
              Cancel
            </Button>
            <Button loading={saveLesson.isPending} onClick={() => saveLesson.mutate()}>
              <Save className="h-4 w-4" /> {editingLesson ? 'Save lesson' : 'Add lesson'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {lessonError && (
            <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {lessonError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Lesson title (English)"
              required
              value={lessonForm.title}
              onChange={(event) => setLessonForm((current) => ({ ...current, title: event.target.value }))}
            />
            <Input
              label="Lesson title (Telugu)"
              value={lessonForm.titleTe}
              onChange={(event) => setLessonForm((current) => ({ ...current, titleTe: event.target.value }))}
            />
          </div>
          <Input
            label="YouTube URL"
            required
            value={lessonForm.youtubeUrl}
            onChange={(event) => setLessonForm((current) => ({ ...current, youtubeUrl: event.target.value }))}
            placeholder="https://www.youtube.com/watch?v=…"
            hint="A valid YouTube watch, share or embed URL is required."
          />
          <Textarea
            label="Lesson notes (English, optional)"
            rows={3}
            value={lessonForm.description}
            onChange={(event) => setLessonForm((current) => ({ ...current, description: event.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Duration (minutes)"
              type="number"
              min={0}
              max={1000}
              value={lessonForm.durationMinutes}
              onChange={(event) => setLessonForm((current) => ({ ...current, durationMinutes: Number(event.target.value) }))}
            />
            <div className="flex items-end pb-2">
              <Checkbox
                label="Free preview lesson"
                checked={lessonForm.isPreview}
                onChange={(event) => setLessonForm((current) => ({ ...current, isPreview: event.target.checked }))}
              />
            </div>
          </div>
          <Textarea
            label="Resources (one per line: Title | URL)"
            rows={3}
            value={lessonForm.resourcesText}
            onChange={(event) => setLessonForm((current) => ({ ...current, resourcesText: event.target.value }))}
            placeholder="Linux man pages | https://man7.org/linux/man-pages/"
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteLesson.mutate(pendingDelete.id)}
        title="Delete this lesson?"
        description={`“${pendingDelete?.title || ''}” will be removed from the course.`}
        confirmLabel="Delete lesson"
        loading={deleteLesson.isPending}
      />
    </>
  );
}
