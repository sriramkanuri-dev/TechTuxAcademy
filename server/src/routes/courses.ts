import { Router } from 'express';
import { Prisma, Difficulty } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../lib/errors';
import { courseSchema, courseUpdateSchema, lessonSchema, lessonUpdateSchema, reorderSchema, validate } from '../lib/validation';
import { requireAdmin } from '../lib/auth';
import { uniqueSlug } from '../lib/slug';
import { extractYouTubeId } from '../lib/youtube';
import { getCourseProgress, recomputeCourseDuration } from '../services/learning';
import {
  deleteCourseResourceFiles,
  deleteLessonResourceFiles,
  markCourseResourcesOutdated,
  markLessonResourcesOutdated,
} from '../services/resources/generator';
import {
  scheduleCourseGeneration,
  scheduleLessonGeneration,
} from '../services/resources/queue';

const router = Router();

const courseCardInclude = {
  category: { select: { id: true, name: true, nameTe: true, slug: true, color: true, icon: true } },
  instructor: { select: { id: true, name: true, avatar: true } },
  _count: { select: { lessons: true, enrollments: true } },
} satisfies Prisma.CourseInclude;

function pagination(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(48, Math.max(1, Number(query.limit) || 12));
  return { page, limit, skip: (page - 1) * limit };
}

// ── Public catalog ────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();
    const difficulty = String(req.query.difficulty || '').trim();
    const featured = req.query.featured === 'true';
    const sort = String(req.query.sort || 'newest');

    const where: Prisma.CourseWhereInput = { published: true };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ];
    }
    if (category) where.category = { slug: category };
    if (difficulty && ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(difficulty)) {
      where.difficulty = difficulty as Difficulty;
    }
    if (featured) where.featured = true;

    const orderBy: Prisma.CourseOrderByWithRelationInput[] =
      sort === 'az'
        ? [{ title: 'asc' }]
        : sort === 'popular'
          ? [{ enrollments: { _count: 'desc' } }, { createdAt: 'desc' }]
          : [{ featured: 'desc' }, { createdAt: 'desc' }];

    const [courses, total] = await Promise.all([
      prisma.course.findMany({ where, include: courseCardInclude, orderBy, skip, take: limit }),
      prisma.course.count({ where }),
    ]);

    res.json({
      courses,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  })
);

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({
      where: { slug: req.params.slug },
      include: {
        ...courseCardInclude,
        lessons: { orderBy: { order: 'asc' } },
      },
    });
    if (!course) throw new ApiError(404, 'Course not found.');
    if (!course.published && req.user?.role !== 'ADMIN') {
      throw new ApiError(404, 'Course not found.');
    }

    let enrollment = null;
    let progress = null;
    if (req.user) {
      enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
      });
      if (enrollment) {
        progress = await getCourseProgress(req.user.id, course.id);
      }
    }

    // Lock full lesson videos for visitors who have not enrolled yet.
    const canWatchAll = Boolean(enrollment) || req.user?.role === 'ADMIN';
    const safeCourse = {
      ...course,
      lessons: course.lessons.map((lesson) =>
        lesson.isPreview || canWatchAll
          ? { ...lesson, locked: false }
          : { ...lesson, youtubeUrl: '', youtubeId: '', resources: null, locked: true }
      ),
    };

    res.json({ course: safeCourse, enrollment, progress });
  })
);

// ── Admin course management ───────────────────────────────────────────
router.get(
  '/admin/all',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();

    const where: Prisma.CourseWhereInput = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status === 'published') where.published = true;
    if (status === 'draft') where.published = false;

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          ...courseCardInclude,
          _count: { select: { lessons: true, enrollments: true, certificates: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.course.count({ where }),
    ]);
    res.json({
      courses,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  })
);

router.get(
  '/admin/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        instructor: { select: { id: true, name: true, email: true } },
        lessons: { orderBy: { order: 'asc' } },
        _count: { select: { enrollments: true, certificates: true } },
      },
    });
    if (!course) throw new ApiError(404, 'Course not found.');
    res.json({ course });
  })
);

router.post(
  '/admin/create',
  requireAdmin,
  validate(courseSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const body = req.body;
    const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!category) throw new ApiError(422, 'Choose a valid category.');

    const instructorId = body.instructorId ?? req.user.id;
    const instructor = await prisma.user.findUnique({ where: { id: instructorId } });
    if (!instructor) throw new ApiError(422, 'Choose a valid instructor.');

    const slug =
      body.slug ||
      (await uniqueSlug(body.title, async (candidate) =>
        Boolean(await prisma.course.findUnique({ where: { slug: candidate } }))
      ));

    const course = await prisma.course.create({
      data: {
        title: body.title,
        titleTe: body.titleTe ?? null,
        slug,
        description: body.description,
        descriptionTe: body.descriptionTe ?? null,
        longDescription: body.longDescription ?? null,
        longDescriptionTe: body.longDescriptionTe ?? null,
        thumbnail: body.thumbnail ?? null,
        difficulty: body.difficulty ?? 'BEGINNER',
        durationMinutes: body.durationMinutes ?? 0,
        language: body.language ?? 'en',
        published: body.published ?? false,
        featured: body.featured ?? false,
        certificateThreshold: body.certificateThreshold ?? 100,
        objectives: body.objectives ?? [],
        objectivesTe: body.objectivesTe ?? [],
        tags: body.tags ?? [],
        requirements: body.requirements ?? [],
        categoryId: body.categoryId,
        instructorId,
      },
      include: courseCardInclude,
    });
    res.status(201).json({ course, message: 'Course created.' });
  })
);

router.put(
  '/admin/:id',
  requireAdmin,
  validate(courseUpdateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'Course not found.');
    const body = req.body;

    if (body.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
      if (!category) throw new ApiError(422, 'Choose a valid category.');
    }
    if (body.instructorId) {
      const instructor = await prisma.user.findUnique({ where: { id: body.instructorId } });
      if (!instructor) throw new ApiError(422, 'Choose a valid instructor.');
    }

    let slug = existing.slug;
    if (body.slug && body.slug !== existing.slug) {
      slug = await uniqueSlug(body.slug, async (candidate) =>
        Boolean(await prisma.course.findFirst({ where: { slug: candidate, NOT: { id: existing.id } } }))
      );
    }

    const course = await prisma.course.update({
      where: { id: existing.id },
      data: {
        ...body,
        slug,
        titleTe: body.titleTe === undefined ? undefined : body.titleTe,
        descriptionTe: body.descriptionTe === undefined ? undefined : body.descriptionTe,
        longDescription: body.longDescription === undefined ? undefined : body.longDescription,
        longDescriptionTe: body.longDescriptionTe === undefined ? undefined : body.longDescriptionTe,
        thumbnail: body.thumbnail === undefined ? undefined : body.thumbnail,
        certificateThreshold: body.certificateThreshold,
      },
      include: courseCardInclude,
    });
    res.json({ course, message: 'Course updated.' });
  })
);

router.patch(
  '/admin/:id/status',
  requireAdmin,
  validate(z.object({ published: z.boolean() })),
  asyncHandler(async (req, res) => {
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { published: req.body.published },
    });
    res.json({
      course,
      message: req.body.published ? 'Course published.' : 'Course moved to drafts.',
    });
  })
);

router.delete(
  '/admin/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.course.delete({ where: { id: req.params.id } });
    res.json({ message: 'Course and its lessons were deleted.' });
  })
);

// ── Lesson management ─────────────────────────────────────────────────
router.post(
  '/admin/:courseId/lessons',
  requireAdmin,
  validate(lessonSchema),
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course) throw new ApiError(404, 'Course not found.');

    const youtubeId = extractYouTubeId(req.body.youtubeUrl);
    if (!youtubeId) throw new ApiError(422, 'Enter a valid YouTube video URL.');

    const max = await prisma.lesson.aggregate({
      where: { courseId: course.id },
      _max: { order: true },
    });

    const lesson = await prisma.lesson.create({
      data: {
        courseId: course.id,
        title: req.body.title,
        titleTe: req.body.titleTe ?? null,
        description: req.body.description ?? null,
        descriptionTe: req.body.descriptionTe ?? null,
        youtubeUrl: req.body.youtubeUrl,
        youtubeId,
        durationMinutes: req.body.durationMinutes ?? 0,
        order: req.body.order ?? (max._max.order ?? 0) + 1,
        isPreview: req.body.isPreview ?? false,
        resources:
          req.body.resources === undefined
            ? undefined
            : req.body.resources === null
              ? Prisma.JsonNull
              : req.body.resources,
      },
    });
    await recomputeCourseDuration(course.id);
    res.status(201).json({ lesson, message: 'Lesson added.' });
  })
);

router.put(
  '/admin/lessons/:lessonId',
  requireAdmin,
  validate(lessonUpdateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.lesson.findUnique({ where: { id: req.params.lessonId } });
    if (!existing) throw new ApiError(404, 'Lesson not found.');

    let youtubeId = existing.youtubeId;
    if (req.body.youtubeUrl && req.body.youtubeUrl !== existing.youtubeUrl) {
      const parsed = extractYouTubeId(req.body.youtubeUrl);
      if (!parsed) throw new ApiError(422, 'Enter a valid YouTube video URL.');
      youtubeId = parsed;
    }

    const lesson = await prisma.lesson.update({
      where: { id: existing.id },
      data: {
        ...req.body,
        youtubeId,
        resources:
          req.body.resources === undefined
            ? undefined
            : req.body.resources === null
              ? Prisma.JsonNull
              : req.body.resources,
      },
    });
    await recomputeCourseDuration(existing.courseId);
    res.json({ lesson, message: 'Lesson updated.' });
  })
);

router.delete(
  '/admin/lessons/:lessonId',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const lesson = await prisma.lesson.findUnique({ where: { id: req.params.lessonId } });
    if (!lesson) throw new ApiError(404, 'Lesson not found.');
    await prisma.lesson.delete({ where: { id: lesson.id } });
    await recomputeCourseDuration(lesson.courseId);
    res.json({ message: 'Lesson deleted.' });
  })
);

router.patch(
  '/admin/:courseId/lessons/reorder',
  requireAdmin,
  validate(reorderSchema),
  asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { lessonIds } = req.body;
    const lessons = await prisma.lesson.findMany({ where: { courseId }, select: { id: true } });
    const validIds = new Set(lessons.map((lesson) => lesson.id));
    if (lessonIds.length !== lessons.length || lessonIds.some((id: string) => !validIds.has(id))) {
      throw new ApiError(422, 'The lesson order does not match this course.');
    }
    await prisma.$transaction(
      lessonIds.map((id: string, index: number) =>
        prisma.lesson.update({ where: { id }, data: { order: index + 1 } })
      )
    );
    res.json({ message: 'Lesson order updated.' });
  })
);

export default router;
