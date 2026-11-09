import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { ResourceStatus, ResourceType, type LessonResource } from '@prisma/client';
import { prisma } from '../../db';
import { slugify } from '../../lib/slug';
import { renderCommandCheatSheet, renderLessonNotes } from './pdf';
import { buildLessonPlan } from './plan';
import type {
  GeneratedFile,
  GenerationResult,
  LessonResourceView,
  ResourceCourse,
  ResourceLesson,
} from './types';
import {
  absoluteResourcePath,
  deleteResourceFile,
  lessonResourceDir,
  relativeResourcePath,
  removeEmptyLessonDir,
  writeResourceFile,
} from './storage';

const ALL_TYPES: ResourceType[] = [ResourceType.LESSON_NOTES, ResourceType.COMMAND_CHEATSHEET];

const lessonInclude = {
  course: {
    include: {
      category: { select: { name: true, nameTe: true, slug: true } },
      instructor: { select: { name: true } },
    },
  },
} as const;

type LessonWithCourse = Awaited<ReturnType<typeof loadLesson>>;

async function loadLesson(lessonId: string) {
  return prisma.lesson.findUnique({ where: { id: lessonId }, include: lessonInclude });
}

function toResourceCourse(lesson: NonNullable<LessonWithCourse>): ResourceCourse {
  const course = lesson.course;
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    titleTe: course.titleTe,
    description: course.description,
    descriptionTe: course.descriptionTe,
    longDescription: course.longDescription,
    longDescriptionTe: course.longDescriptionTe,
    difficulty: course.difficulty,
    objectives: course.objectives,
    objectivesTe: course.objectivesTe,
    requirements: course.requirements,
    tags: course.tags,
    category: course.category,
    instructor: course.instructor,
  };
}

function toResourceLesson(lesson: NonNullable<LessonWithCourse>): ResourceLesson {
  return {
    id: lesson.id,
    title: lesson.title,
    titleTe: lesson.titleTe,
    description: lesson.description,
    descriptionTe: lesson.descriptionTe,
    youtubeUrl: lesson.youtubeUrl,
    durationMinutes: lesson.durationMinutes,
    order: lesson.order,
    resources: lesson.resources,
    course: toResourceCourse(lesson),
  };
}

export async function resolveLessonSlug(lesson: { id: string; courseId: string; title: string }): Promise<string> {
  const siblings = await prisma.lesson.findMany({
    where: { courseId: lesson.courseId },
    select: { id: true, title: true, order: true },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
  });
  const counts = new Map<string, number>();
  for (const sibling of siblings) {
    const base = slugify(sibling.title) || `lesson-${sibling.id.slice(-6)}`;
    const next = (counts.get(base) || 0) + 1;
    counts.set(base, next);
    const slug = next === 1 ? base : `${base}-${next}`;
    if (sibling.id === lesson.id) return slug;
  }
  return slugify(lesson.title) || `lesson-${lesson.id.slice(-6)}`;
}

function validatePdf(buffer: Buffer, label: string): void {
  if (!buffer.length || buffer.length < 1000) {
    throw new Error(`${label} is empty or too small (${buffer.length} bytes).`);
  }
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new Error(`${label} does not start with a PDF header.`);
  }
  const tail = buffer.subarray(Math.max(0, buffer.length - 1024)).toString('latin1');
  if (!tail.includes('%%EOF')) {
    throw new Error(`${label} is missing the PDF EOF marker.`);
  }
}

export function resourceView(resource: LessonResource): LessonResourceView {
  return {
    id: resource.id,
    lessonId: resource.lessonId,
    resourceType: resource.resourceType,
    fileName: resource.fileName,
    mimeType: resource.mimeType,
    fileSize: resource.fileSize,
    version: resource.version,
    status: resource.status,
    outdated: resource.outdated,
    generatedAt: resource.generatedAt ? resource.generatedAt.toISOString() : null,
    updatedAt: resource.updatedAt.toISOString(),
    error: resource.error,
    previewUrl: `/api/resources/${resource.id}/file`,
    downloadUrl: `/api/resources/${resource.id}/file?download=1`,
  };
}

async function upsertStatus(
  lessonId: string,
  resourceType: ResourceType,
  status: ResourceStatus,
  extra: Partial<LessonResource> = {}
): Promise<void> {
  await prisma.lessonResource.upsert({
    where: { lessonId_resourceType: { lessonId, resourceType } },
    create: {
      lessonId,
      resourceType,
      fileName: extra.fileName || '',
      storagePath: extra.storagePath || '',
      status,
      ...extra,
    },
    update: { status, ...extra },
  });
}

async function persistGenerated(
  lessonId: string,
  file: GeneratedFile,
  contentHash: string
): Promise<LessonResource> {
  return prisma.lessonResource.upsert({
    where: { lessonId_resourceType: { lessonId, resourceType: file.resourceType } },
    create: {
      lessonId,
      resourceType: file.resourceType,
      fileName: file.fileName,
      storagePath: file.storagePath,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      version: 1,
      status: ResourceStatus.READY,
      outdated: false,
      contentHash,
      error: null,
      generatedAt: new Date(),
    },
    update: {
      fileName: file.fileName,
      storagePath: file.storagePath,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      version: { increment: 1 },
      status: ResourceStatus.READY,
      outdated: false,
      contentHash,
      error: null,
      generatedAt: new Date(),
    },
  });
}

async function removeResourceRecord(resource: LessonResource): Promise<void> {
  try {
    await deleteResourceFile(absoluteResourcePath(resource.storagePath));
  } catch {
    // The file may already be gone; the database record is still removed.
  }
  await prisma.lessonResource.delete({ where: { id: resource.id } }).catch(() => undefined);
}

export interface GenerateOptions {
  types?: ResourceType[];
  /** Regenerate even when a READY resource with the same content hash exists. */
  force?: boolean;
}

export async function generateLessonResources(
  lessonId: string,
  options: GenerateOptions = {}
): Promise<GenerationResult> {
  const lesson = await loadLesson(lessonId);
  if (!lesson) throw new Error(`Lesson ${lessonId} was not found.`);

  const course = toResourceCourse(lesson);
  const resourceLesson = toResourceLesson(lesson);
  const plan = buildLessonPlan(course, resourceLesson);
  const slug = await resolveLessonSlug(lesson);
  const dir = lessonResourceDir(course.slug, slug);

  const targetTypes: ResourceType[] = options.types?.length
    ? options.types
    : plan.hasCommands
      ? ALL_TYPES
      : [ResourceType.LESSON_NOTES];

  const existing = await prisma.lessonResource.findMany({ where: { lessonId } });
  const existingByType = new Map(existing.map((resource) => [resource.resourceType, resource]));

  // A lesson with no commands should not keep a stale cheat sheet.
  if (!plan.hasCommands) {
    const stale = existingByType.get(ResourceType.COMMAND_CHEATSHEET);
    if (stale) await removeResourceRecord(stale);
    existingByType.delete(ResourceType.COMMAND_CHEATSHEET);
  }

  const generated: ResourceType[] = [];
  const skipped: ResourceType[] = [];
  const failed: { resourceType: ResourceType; error: string }[] = [];

  for (const resourceType of targetTypes) {
    const current = existingByType.get(resourceType);
    if (
      !options.force &&
      current &&
      current.status === ResourceStatus.READY &&
      !current.outdated &&
      current.contentHash === plan.contentHash &&
      current.storagePath &&
      fs.existsSync(absoluteResourcePath(current.storagePath))
    ) {
      skipped.push(resourceType);
      continue;
    }

    await upsertStatus(lessonId, resourceType, ResourceStatus.GENERATING, {
      contentHash: plan.contentHash,
      error: null,
    });

    try {
      const isNotes = resourceType === ResourceType.LESSON_NOTES;
      const rendered = isNotes ? await renderLessonNotes(plan) : await renderCommandCheatSheet(plan);
      const fileName = isNotes ? `${slug}.pdf` : `${slug}-commandscheatsheet.pdf`;
      validatePdf(rendered.buffer, fileName);
      if (rendered.pageCount < 1) throw new Error(`${fileName} has no pages.`);

      const absolutePath = path.join(dir, fileName);
      await writeResourceFile(absolutePath, rendered.buffer);

      // Remove a previous file if the slug or filename changed.
      if (current && current.storagePath && current.storagePath !== relativeResourcePath(absolutePath)) {
        await deleteResourceFile(absoluteResourcePath(current.storagePath)).catch(() => undefined);
      }

      const file: GeneratedFile = {
        resourceType,
        fileName,
        storagePath: relativeResourcePath(absolutePath),
        absolutePath,
        buffer: rendered.buffer,
        fileSize: rendered.buffer.length,
        mimeType: 'application/pdf',
        pageCount: rendered.pageCount,
        contentHash: plan.contentHash,
        hasCommands: plan.hasCommands,
      };
      const record = await persistGenerated(lessonId, file, plan.contentHash);
      existingByType.set(resourceType, record);
      generated.push(resourceType);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await upsertStatus(lessonId, resourceType, ResourceStatus.FAILED, {
        contentHash: plan.contentHash,
        error: message.slice(0, 1000),
      });
      failed.push({ resourceType, error: message });
    }
  }

  const resources = await prisma.lessonResource.findMany({ where: { lessonId } });
  if (resources.length === 0) {
    await removeEmptyLessonDir(course.slug, slug);
  }

  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    courseId: course.id,
    courseTitle: course.title,
    generated,
    skipped,
    failed,
    hasCommands: plan.hasCommands,
    resources: resources.map(resourceView),
  };
}

export async function getLessonResourceViews(lessonId: string): Promise<LessonResourceView[]> {
  const resources = await prisma.lessonResource.findMany({
    where: { lessonId },
    orderBy: { resourceType: 'asc' },
  });
  return resources.map(resourceView);
}

export async function getResourceRecord(id: string) {
  return prisma.lessonResource.findUnique({ where: { id }, include: { lesson: { include: { course: true } } } });
}

export async function markLessonResourcesOutdated(lessonId: string): Promise<number> {
  const result = await prisma.lessonResource.updateMany({
    where: { lessonId, status: ResourceStatus.READY, outdated: false },
    data: { outdated: true },
  });
  return result.count;
}

export async function markCourseResourcesOutdated(courseId: string): Promise<number> {
  const result = await prisma.lessonResource.updateMany({
    where: { lesson: { courseId }, status: ResourceStatus.READY, outdated: false },
    data: { outdated: true },
  });
  return result.count;
}

export interface MissingResource {
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  missing: ResourceType[];
  outdated: ResourceType[];
  failed: ResourceType[];
}

export async function detectMissingResources(courseId?: string): Promise<MissingResource[]> {
  const lessons = await prisma.lesson.findMany({
    where: courseId ? { courseId } : undefined,
    include: { ...lessonInclude, resourceFiles: true },
    orderBy: [{ courseId: 'asc' }, { order: 'asc' }],
  });

  const missing: MissingResource[] = [];
  for (const lesson of lessons) {
    const course = toResourceCourse(lesson);
    const resourceLesson = toResourceLesson(lesson);
    const plan = buildLessonPlan(course, resourceLesson);
    const expected = plan.hasCommands ? ALL_TYPES : [ResourceType.LESSON_NOTES];
    const byType = new Map(lesson.resourceFiles.map((resource) => [resource.resourceType, resource]));

    const missingTypes: ResourceType[] = [];
    const outdatedTypes: ResourceType[] = [];
    const failedTypes: ResourceType[] = [];
    for (const type of expected) {
      const record = byType.get(type);
      if (!record) {
        missingTypes.push(type);
      } else if (record.status === ResourceStatus.FAILED) {
        failedTypes.push(type);
      } else if (record.outdated || record.status !== ResourceStatus.READY) {
        outdatedTypes.push(type);
      } else if (!fs.existsSync(absoluteResourcePath(record.storagePath))) {
        missingTypes.push(type);
      }
    }
    if (missingTypes.length || outdatedTypes.length || failedTypes.length) {
      missing.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonOrder: lesson.order,
        courseId: lesson.course.id,
        courseTitle: lesson.course.title,
        courseSlug: lesson.course.slug,
        missing: missingTypes,
        outdated: outdatedTypes,
        failed: failedTypes,
      });
    }
  }
  return missing;
}

export async function deleteResourceById(id: string): Promise<void> {
  const resource = await prisma.lessonResource.findUnique({ where: { id } });
  if (!resource) return;
  await removeResourceRecord(resource);
}

/** Remove every generated file and record for a lesson (used before deleting it). */
export async function deleteLessonResourceFiles(lessonId: string): Promise<void> {
  const resources = await prisma.lessonResource.findMany({ where: { lessonId } });
  for (const resource of resources) {
    await removeResourceRecord(resource);
  }
}

/** Remove every generated file and record for a course (used before deleting it). */
export async function deleteCourseResourceFiles(courseId: string): Promise<void> {
  const resources = await prisma.lessonResource.findMany({
    where: { lesson: { courseId } },
  });
  for (const resource of resources) {
    await removeResourceRecord(resource);
  }
}

export async function resourceStats() {
  const [total, ready, outdated, failed, generating, queued] = await Promise.all([
    prisma.lessonResource.count(),
    prisma.lessonResource.count({ where: { status: ResourceStatus.READY } }),
    prisma.lessonResource.count({ where: { outdated: true } }),
    prisma.lessonResource.count({ where: { status: ResourceStatus.FAILED } }),
    prisma.lessonResource.count({ where: { status: ResourceStatus.GENERATING } }),
    prisma.lessonResource.count({ where: { status: ResourceStatus.QUEUED } }),
  ]);
  return { total, ready, outdated, failed, generating, queued };
}

export async function cleanupMissingFiles(): Promise<number> {
  const resources = await prisma.lessonResource.findMany();
  let removed = 0;
  for (const resource of resources) {
    if (!resource.storagePath) continue;
    if (!fs.existsSync(absoluteResourcePath(resource.storagePath))) {
      await prisma.lessonResource.delete({ where: { id: resource.id } });
      removed += 1;
    }
  }
  return removed;
}

export async function readResourceBuffer(resource: LessonResource): Promise<Buffer> {
  const absolute = absoluteResourcePath(resource.storagePath);
  return fsp.readFile(absolute);
}

export { ALL_TYPES };
