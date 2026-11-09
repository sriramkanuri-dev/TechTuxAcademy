import { prisma } from '../../db';
import { config } from '../../config';
import { generateLessonResources } from './generator';
import { ResourceType } from '@prisma/client';

export type ResourceJobKind = 'lesson' | 'course' | 'all';
export type ResourceJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';

export interface ResourceJobError {
  lessonId: string;
  lessonTitle: string;
  error: string;
}

export interface ResourceJobView {
  id: string;
  kind: ResourceJobKind;
  targetId: string | null;
  targetLabel: string;
  status: ResourceJobStatus;
  total: number;
  completed: number;
  failed: number;
  resourcesGenerated: number;
  currentLesson: string | null;
  errors: ResourceJobError[];
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

interface JobState extends ResourceJobView {
  remaining: number;
}

interface QueueItem {
  jobId: string;
  lessonId: string;
  lessonTitle: string;
  options?: { types?: ResourceType[]; force?: boolean };
}

const CONCURRENCY = Math.min(4, Math.max(1, Number(process.env.RESOURCE_GENERATION_CONCURRENCY || 2)));

const jobs = new Map<string, JobState>();
const items: QueueItem[] = [];
const pendingLessonIds = new Set<string>();
let active = 0;

function jobId(): string {
  return `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function view(job: JobState): ResourceJobView {
  const { remaining: _remaining, ...rest } = job;
  return { ...rest, errors: [...job.errors] };
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

async function processItem(item: QueueItem): Promise<void> {
  const job = jobs.get(item.jobId);
  if (!job) return;
  job.currentLesson = item.lessonTitle;
  try {
    await yieldToEventLoop();
    const result = await generateLessonResources(item.lessonId, item.options);
    job.resourcesGenerated += result.generated.length;
    if (result.failed.length) {
      job.failed += 1;
      for (const failure of result.failed) {
        job.errors.push({
          lessonId: item.lessonId,
          lessonTitle: item.lessonTitle,
          error: `${failure.resourceType}: ${failure.error}`,
        });
      }
    } else {
      job.completed += 1;
    }
  } catch (error) {
    job.failed += 1;
    job.errors.push({
      lessonId: item.lessonId,
      lessonTitle: item.lessonTitle,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    pendingLessonIds.delete(item.lessonId);
    job.remaining -= 1;
    if (job.remaining <= 0) {
      job.status = job.failed > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
      job.currentLesson = null;
      job.finishedAt = new Date().toISOString();
    }
  }
}

function pump(): void {
  while (active < CONCURRENCY && items.length > 0) {
    const item = items.shift()!;
    active += 1;
    void processItem(item).finally(() => {
      active -= 1;
      pump();
    });
  }
}

async function createJob(
  kind: ResourceJobKind,
  targetId: string | null,
  targetLabel: string,
  lessons: { id: string; title: string }[],
  options: { types?: ResourceType[]; force?: boolean } = {}
): Promise<ResourceJobView> {
  const job: JobState = {
    id: jobId(),
    kind,
    targetId,
    targetLabel,
    status: lessons.length ? 'QUEUED' : 'COMPLETED',
    total: lessons.length,
    completed: 0,
    failed: 0,
    resourcesGenerated: 0,
    currentLesson: null,
    errors: [],
    createdAt: new Date().toISOString(),
    startedAt: lessons.length ? null : new Date().toISOString(),
    finishedAt: lessons.length ? null : new Date().toISOString(),
    remaining: lessons.length,
  };
  jobs.set(job.id, job);

  let added = 0;
  for (const lesson of lessons) {
    if (pendingLessonIds.has(lesson.id)) continue;
    pendingLessonIds.add(lesson.id);
    items.push({ jobId: job.id, lessonId: lesson.id, lessonTitle: lesson.title, options });
    added += 1;
  }
  job.total = added;
  job.remaining = added;
  if (added === 0) {
    job.status = 'COMPLETED';
    job.startedAt = new Date().toISOString();
    job.finishedAt = job.startedAt;
  } else {
    job.status = 'RUNNING';
    job.startedAt = new Date().toISOString();
    pump();
  }

  // Keep the job history bounded so a long-running process does not leak memory.
  if (jobs.size > 200) {
    const finished = [...jobs.values()]
      .filter((entry) => entry.finishedAt)
      .sort((a, b) => (a.finishedAt! < b.finishedAt! ? -1 : 1));
    for (const entry of finished.slice(0, jobs.size - 200)) jobs.delete(entry.id);
  }

  return view(job);
}

export async function enqueueLessonGeneration(
  lessonId: string,
  options: { types?: ResourceType[]; force?: boolean } = {}
): Promise<ResourceJobView> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, title: true, course: { select: { title: true } } },
  });
  if (!lesson) throw new Error('Lesson not found.');
  return createJob('lesson', lessonId, lesson.title, [{ id: lesson.id, title: lesson.title }], options);
}

export async function enqueueCourseGeneration(
  courseId: string,
  options: { force?: boolean } = {}
): Promise<ResourceJobView> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      lessons: { select: { id: true, title: true }, orderBy: { order: 'asc' } },
    },
  });
  if (!course) throw new Error('Course not found.');
  return createJob('course', courseId, course.title, course.lessons, options);
}

export async function enqueueAllGeneration(options: { force?: boolean } = {}): Promise<ResourceJobView> {
  const lessons = await prisma.lesson.findMany({
    select: { id: true, title: true },
    orderBy: [{ courseId: 'asc' }, { order: 'asc' }],
  });
  return createJob('all', null, 'All courses', lessons, options);
}

export function listJobs(): ResourceJobView[] {
  return [...jobs.values()]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(view);
}

export function getJob(id: string): ResourceJobView | null {
  const job = jobs.get(id);
  return job ? view(job) : null;
}

export function queueSnapshot() {
  return {
    concurrency: CONCURRENCY,
    active,
    queued: items.length,
    pendingLessons: pendingLessonIds.size,
    jobs: listJobs(),
  };
}

export function autoGenerateEnabled(): boolean {
  return config.autoGenerateResources;
}

/** Fire-and-forget helper used by lesson create/update hooks. */
export function scheduleLessonGeneration(lessonId: string): void {
  if (!config.autoGenerateResources) return;
  enqueueLessonGeneration(lessonId).catch((error) => {
    console.error('[resources] Failed to schedule generation:', error);
  });
}

/** Fire-and-forget helper used when course-level content changes. */
export function scheduleCourseGeneration(courseId: string): void {
  if (!config.autoGenerateResources) return;
  enqueueCourseGeneration(courseId).catch((error) => {
    console.error('[resources] Failed to schedule course generation:', error);
  });
}
