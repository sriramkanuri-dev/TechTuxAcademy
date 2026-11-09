import { Router } from 'express';
import { ResourceType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../lib/errors';
import { requireRole } from '../lib/auth';
import { validate } from '../lib/validation';
import {
  ALL_TYPES,
  cleanupMissingFiles,
  deleteResourceById,
  detectMissingResources,
  generateLessonResources,
  getResourceRecord,
  markCourseResourcesOutdated,
  markLessonResourcesOutdated,
  resourceStats,
  resourceView,
} from '../services/resources/generator';
import {
  autoGenerateEnabled,
  enqueueAllGeneration,
  enqueueCourseGeneration,
  enqueueLessonGeneration,
  getJob,
  listJobs,
  queueSnapshot,
} from '../services/resources/queue';

const router = Router();
router.use(requireRole('ADMIN', 'INSTRUCTOR'));

async function assertCourseAccess(userId: string, role: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, slug: true, instructorId: true },
  });
  if (!course) throw new ApiError(404, 'Course not found.');
  if (role !== 'ADMIN' && course.instructorId !== userId) {
    throw new ApiError(403, 'You can only manage resources for your own courses.');
  }
  return course;
}

async function assertLessonAccess(userId: string, role: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, title: true, courseId: true, course: { select: { instructorId: true } } },
  });
  if (!lesson) throw new ApiError(404, 'Lesson not found.');
  if (role !== 'ADMIN' && lesson.course.instructorId !== userId) {
    throw new ApiError(403, 'You can only manage resources for your own courses.');
  }
  return lesson;
}

const typeSchema = z
  .array(z.nativeEnum(ResourceType))
  .min(1)
  .optional();

const generateSchema = z.object({
  types: typeSchema,
  force: z.boolean().optional(),
});

// ── Overview ──────────────────────────────────────────────────────────
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const isAdmin = req.user.role === 'ADMIN';

    const courses = await prisma.course.findMany({
      where: isAdmin ? undefined : { instructorId: req.user.id },
      select: {
        id: true,
        title: true,
        slug: true,
        published: true,
        instructorId: true,
        _count: { select: { lessons: true } },
      },
      orderBy: { title: 'asc' },
    });

    const courseIds = courses.map((course) => course.id);
    const [stats, resources, missing] = await Promise.all([
      resourceStats(),
      prisma.lessonResource.findMany({
        where: { lesson: { courseId: { in: courseIds } } },
        select: {
          id: true,
          lessonId: true,
          resourceType: true,
          status: true,
          outdated: true,
          generatedAt: true,
          updatedAt: true,
          fileName: true,
          fileSize: true,
          version: true,
          error: true,
          lesson: { select: { courseId: true } },
        },
      }),
      detectMissingResources(),
    ]);

    const visibleMissing = missing.filter((entry) => courseIds.includes(entry.courseId));
    const byCourse = new Map<
      string,
      {
        courseId: string;
        courseTitle: string;
        courseSlug: string;
        published: boolean;
        lessons: number;
        ready: number;
        outdated: number;
        failed: number;
        missing: number;
        expected: number;
      }
    >();

    for (const course of courses) {
      byCourse.set(course.id, {
        courseId: course.id,
        courseTitle: course.title,
        courseSlug: course.slug,
        published: course.published,
        lessons: course._count.lessons,
        ready: 0,
        outdated: 0,
        failed: 0,
        missing: 0,
        expected: course._count.lessons * ALL_TYPES.length,
      });
    }

    for (const resource of resources) {
      const bucket = byCourse.get(resource.lesson.courseId);
      if (!bucket) continue;
      if (resource.status === 'READY' && !resource.outdated) bucket.ready += 1;
      if (resource.outdated) bucket.outdated += 1;
      if (resource.status === 'FAILED') bucket.failed += 1;
    }
    for (const entry of visibleMissing) {
      const bucket = byCourse.get(entry.courseId);
      if (!bucket) continue;
      bucket.missing += entry.missing.length;
      bucket.outdated += entry.outdated.length;
      bucket.failed += entry.failed.length;
    }

    const recentJobs = listJobs().slice(0, 8);
    res.json({
      autoGenerate: autoGenerateEnabled(),
      queue: queueSnapshot(),
      stats: isAdmin
        ? stats
        : {
            total: resources.length,
            ready: resources.filter((r) => r.status === 'READY').length,
            outdated: resources.filter((r) => r.outdated).length,
            failed: resources.filter((r) => r.status === 'FAILED').length,
            generating: resources.filter((r) => r.status === 'GENERATING').length,
            queued: resources.filter((r) => r.status === 'QUEUED').length,
          },
      courses: [...byCourse.values()],
      missing: visibleMissing,
      recentJobs,
    });
  })
);

// ── Lesson resources ─────────────────────────────────────────────────
router.get(
  '/lessons/:lessonId',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const lesson = await assertLessonAccess(req.user.id, req.user.role, req.params.lessonId);
    const resources = await prisma.lessonResource.findMany({
      where: { lessonId: lesson.id },
      orderBy: { resourceType: 'asc' },
    });
    res.json({
      lesson: { id: lesson.id, title: lesson.title, courseId: lesson.courseId },
      resources: resources.map(resourceView),
    });
  })
);

// Generate (or regenerate) a single lesson synchronously. Used by the editor's
// per-lesson action where the caller wants to know the result immediately.
router.post(
  '/lessons/:lessonId/generate',
  validate(generateSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const lesson = await assertLessonAccess(req.user.id, req.user.role, req.params.lessonId);
    const result = await generateLessonResources(lesson.id, {
      types: req.body.types,
      force: req.body.force,
    });
    const status = result.failed.length ? 207 : 200;
    res.status(status).json({
      ...result,
      message: result.failed.length
        ? `Generated with ${result.failed.length} error(s).`
        : result.generated.length
          ? 'Resources generated.'
          : 'Resources are already up to date.',
    });
  })
);

// Queue a lesson for background generation.
router.post(
  '/lessons/:lessonId/queue',
  validate(generateSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const lesson = await assertLessonAccess(req.user.id, req.user.role, req.params.lessonId);
    const job = await enqueueLessonGeneration(lesson.id, {
      types: req.body.types,
      force: req.body.force,
    });
    res.status(202).json({ job, message: 'Lesson resources queued.' });
  })
);

router.post(
  '/lessons/:lessonId/outdated',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const lesson = await assertLessonAccess(req.user.id, req.user.role, req.params.lessonId);
    const count = await markLessonResourcesOutdated(lesson.id);
    res.json({ updated: count, message: `${count} resource(s) marked outdated.` });
  })
);

// ── Course operations ────────────────────────────────────────────────
router.get(
  '/courses/:courseId',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const course = await assertCourseAccess(req.user.id, req.user.role, req.params.courseId);
    const lessons = await prisma.lesson.findMany({
      where: { courseId: course.id },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        order: true,
        resourceFiles: {
          orderBy: { resourceType: 'asc' },
        },
      },
    });
    res.json({
      course,
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        resources: lesson.resourceFiles.map(resourceView),
      })),
    });
  })
);

router.post(
  '/courses/:courseId/generate',
  validate(generateSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const course = await assertCourseAccess(req.user.id, req.user.role, req.params.courseId);
    const job = await enqueueCourseGeneration(course.id, { force: req.body.force });
    res.status(202).json({ job, message: `Generation queued for ${course.title}.` });
  })
);

router.post(
  '/courses/:courseId/outdated',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const course = await assertCourseAccess(req.user.id, req.user.role, req.params.courseId);
    const count = await markCourseResourcesOutdated(course.id);
    res.json({ updated: count, message: `${count} resource(s) marked outdated.` });
  })
);

// ── Bulk operations ──────────────────────────────────────────────────
router.post(
  '/generate-all',
  validate(generateSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    if (req.user.role !== 'ADMIN') {
      throw new ApiError(403, 'Only administrators can regenerate every course.');
    }
    const job = await enqueueAllGeneration({ force: req.body.force });
    res.status(202).json({ job, message: 'Generation queued for all lessons.' });
  })
);

router.get(
  '/missing',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const missing = await detectMissingResources();
    const isAdmin = req.user.role === 'ADMIN';
    const courseIds = isAdmin
      ? null
      : new Set(
          (
            await prisma.course.findMany({
              where: { instructorId: req.user.id },
              select: { id: true },
            })
          ).map((course) => course.id)
        );
    res.json({
      missing: courseIds ? missing.filter((entry) => courseIds.has(entry.courseId)) : missing,
    });
  })
);

// ── Jobs ─────────────────────────────────────────────────────────────
router.get(
  '/jobs',
  asyncHandler(async (_req, res) => {
    res.json({ jobs: listJobs(), queue: queueSnapshot() });
  })
);

router.get(
  '/jobs/:jobId',
  asyncHandler(async (req, res) => {
    const job = getJob(req.params.jobId);
    if (!job) throw new ApiError(404, 'Job not found. It may have expired.');
    res.json({ job });
  })
);

// ── Individual resource maintenance ─────────────────────────────────
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const resource = await getResourceRecord(req.params.id);
    if (!resource) throw new ApiError(404, 'Resource not found.');
    await assertLessonAccess(req.user.id, req.user.role, resource.lessonId);
    res.json({ resource: resourceView(resource) });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const resource = await getResourceRecord(req.params.id);
    if (!resource) throw new ApiError(404, 'Resource not found.');
    await assertLessonAccess(req.user.id, req.user.role, resource.lessonId);
    await deleteResourceById(resource.id);
    res.json({ message: 'Resource deleted. Generate it again when needed.' });
  })
);

router.post(
  '/cleanup',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    if (req.user.role !== 'ADMIN') {
      throw new ApiError(403, 'Only administrators can clean up missing files.');
    }
    const removed = await cleanupMissingFiles();
    res.json({ removed, message: `${removed} stale record(s) removed.` });
  })
);

export default router;
