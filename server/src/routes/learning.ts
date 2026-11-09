import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../lib/errors';
import { requireAuth } from '../lib/auth';
import { getCourseProgress } from '../services/learning';
import { certificateInclude, issueCertificate } from '../services/certificates';
import { validate } from '../lib/validation';

const router = Router();
router.use(requireAuth);

const courseForLearning = {
  category: { select: { id: true, name: true, slug: true, color: true, icon: true } },
  instructor: { select: { id: true, name: true, avatar: true } },
} as const;

async function progressMapFor(userId: string, courseIds: string[]) {
  const lessons = await prisma.lesson.findMany({
    where: { courseId: { in: courseIds } },
    select: { id: true, courseId: true, durationMinutes: true },
  });
  const completed = await prisma.lessonProgress.findMany({
    where: {
      userId,
      completed: true,
      lessonId: { in: lessons.map((lesson) => lesson.id) },
    },
    select: { lessonId: true, completedAt: true, lastWatchedAt: true, lesson: { select: { durationMinutes: true } } },
  });
  const completedIds = new Set(completed.map((row) => row.lessonId));

  return courseIds.map((courseId) => {
    const courseLessons = lessons.filter((lesson) => lesson.courseId === courseId);
    const done = courseLessons.filter((lesson) => completedIds.has(lesson.id)).length;
    return {
      courseId,
      totalLessons: courseLessons.length,
      completedLessons: done,
      percent: courseLessons.length ? Math.round((done / courseLessons.length) * 100) : 0,
    };
  });
}

router.post(
  '/enroll/:courseId',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const course = await prisma.course.findFirst({
      where: { id: req.params.courseId, published: true },
      include: courseForLearning,
    });
    if (!course) throw new ApiError(404, 'Course not found.');

    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
      create: { userId: req.user.id, courseId: course.id },
      update: { lastAccessedAt: new Date() },
    });

    const progress = await getCourseProgress(req.user.id, course.id);
    res.status(201).json({ enrollment, course, progress, message: 'You are enrolled. Start learning!' });
  })
);

router.get(
  '/enrollments',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: req.user.id },
      include: {
        course: {
          include: {
            ...courseForLearning,
            lessons: { select: { id: true }, orderBy: { order: 'asc' } },
            _count: { select: { lessons: true, enrollments: true } },
          },
        },
      },
      orderBy: { lastAccessedAt: 'desc' },
    });
    const progresses = await progressMapFor(
      req.user.id,
      enrollments.map((enrollment) => enrollment.courseId)
    );
    res.json({
      enrollments: enrollments.map((enrollment) => ({
        ...enrollment,
        progress: progresses.find((row) => row.courseId === enrollment.courseId),
      })),
    });
  })
);

router.get(
  '/courses/:slug',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const course = await prisma.course.findUnique({
      where: { slug: req.params.slug },
      include: {
        ...courseForLearning,
        lessons: { orderBy: { order: 'asc' } },
        _count: { select: { lessons: true, enrollments: true } },
      },
    });
    if (!course) throw new ApiError(404, 'Course not found.');
    if (!course.published && req.user.role !== 'ADMIN') throw new ApiError(404, 'Course not found.');

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
    });
    const progress = enrollment ? await getCourseProgress(req.user.id, course.id) : null;
    const recent = enrollment
      ? await prisma.lessonProgress.findMany({
          where: { userId: req.user.id, lesson: { courseId: course.id } },
          orderBy: { lastWatchedAt: 'desc' },
          take: 1,
          select: { lessonId: true, lastWatchedAt: true },
        })
      : [];

    res.json({
      course,
      enrollment,
      progress,
      lastLessonId: recent[0]?.lessonId ?? null,
      enrollmentRequired: !enrollment,
    });
  })
);

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const userId = req.user.id;

    const [enrollments, certificates, recentProgress, allCompleted] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              ...courseForLearning,
              lessons: { select: { id: true, title: true, titleTe: true, order: true }, orderBy: { order: 'asc' } },
              _count: { select: { lessons: true } },
            },
          },
        },
        orderBy: { lastAccessedAt: 'desc' },
      }),
      prisma.certificate.findMany({
        where: { userId, revoked: false },
        include: certificateInclude,
        orderBy: { issuedAt: 'desc' },
        take: 6,
      }),
      prisma.lessonProgress.findMany({
        where: { userId },
        orderBy: { lastWatchedAt: 'desc' },
        take: 8,
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              titleTe: true,
              durationMinutes: true,
              course: { select: { id: true, title: true, slug: true } },
            },
          },
        },
      }),
      prisma.lessonProgress.findMany({
        where: { userId, completed: true },
        select: { lesson: { select: { durationMinutes: true } } },
      }),
    ]);

    const progresses = await progressMapFor(
      userId,
      enrollments.map((enrollment) => enrollment.courseId)
    );

    const enriched = enrollments.map((enrollment) => ({
      ...enrollment,
      progress: progresses.find((row) => row.courseId === enrollment.courseId)!,
    }));

    // Determine the next lesson for each enrollment with a focused query.
    const completedRows = await prisma.lessonProgress.findMany({
      where: { userId, completed: true },
      select: { lessonId: true },
    });
    const completedSet = new Set(completedRows.map((row) => row.lessonId));

    const continueLearning = enriched
      .filter((enrollment) => enrollment.progress.percent < 100)
      .slice(0, 4)
      .map((enrollment) => {
        const nextLesson = enrollment.course.lessons.find((lesson) => !completedSet.has(lesson.id));
        return {
          enrollmentId: enrollment.id,
          course: enrollment.course,
          progress: enrollment.progress,
          nextLesson: nextLesson ?? null,
          lastAccessedAt: enrollment.lastAccessedAt,
        };
      });

    const minutesLearned = allCompleted.reduce(
      (total, row) => total + (row.lesson.durationMinutes || 0),
      0
    );

    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        avatar: req.user.avatar,
        emailVerified: req.user.emailVerified,
      },
      stats: {
        enrolledCourses: enrollments.length,
        completedCourses: progresses.filter((progress) => progress.percent === 100).length,
        certificates: certificates.length,
        minutesLearned,
        lessonsCompleted: completedSet.size,
      },
      enrollments: enriched,
      continueLearning,
      recentLessons: recentProgress,
      certificates,
    });
  })
);

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const history = await prisma.lessonProgress.findMany({
      where: { userId: req.user.id },
      orderBy: { lastWatchedAt: 'desc' },
      take: 50,
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            titleTe: true,
            durationMinutes: true,
            order: true,
            course: { select: { id: true, title: true, slug: true, thumbnail: true } },
          },
        },
      },
    });
    res.json({ history });
  })
);

router.post(
  '/lessons/:lessonId/watch',
  validate(
    z.object({
      secondsWatched: z.coerce.number().int().min(0).max(60 * 60 * 12).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.lessonId },
      include: { course: { select: { id: true } } },
    });
    if (!lesson) throw new ApiError(404, 'Lesson not found.');

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user.id, courseId: lesson.courseId } },
    });
    if (!enrollment) throw new ApiError(403, 'Enroll in this course to track your progress.');

    const progress = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: req.user.id, lessonId: lesson.id } },
      create: {
        userId: req.user.id,
        lessonId: lesson.id,
        secondsWatched: req.body.secondsWatched ?? 0,
      },
      update: {
        lastWatchedAt: new Date(),
        ...(req.body.secondsWatched !== undefined
          ? { secondsWatched: req.body.secondsWatched }
          : {}),
      },
    });
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { lastAccessedAt: new Date() },
    });
    res.json({ progress });
  })
);

router.post(
  '/lessons/:lessonId/complete',
  validate(z.object({ completed: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.lessonId },
      include: {
        course: { select: { id: true, certificateThreshold: true, title: true } },
      },
    });
    if (!lesson) throw new ApiError(404, 'Lesson not found.');

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user.id, courseId: lesson.courseId } },
    });
    if (!enrollment) throw new ApiError(403, 'Enroll in this course to track your progress.');

    const completed = req.body.completed ?? true;
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: req.user.id, lessonId: lesson.id } },
      create: {
        userId: req.user.id,
        lessonId: lesson.id,
        completed,
        completedAt: completed ? new Date() : null,
      },
      update: {
        completed,
        completedAt: completed ? new Date() : null,
        lastWatchedAt: new Date(),
      },
    });

    const progress = await getCourseProgress(req.user.id, lesson.courseId);
    const isComplete = progress.totalLessons > 0 && progress.percent >= lesson.course.certificateThreshold;

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        lastAccessedAt: new Date(),
        completedAt: isComplete ? enrollment.completedAt ?? new Date() : null,
      },
    });

    let certificate = null;
    if (isComplete && completed) {
      try {
        certificate = await issueCertificate(req.user.id, lesson.courseId);
      } catch (error) {
        console.error('[certificate] auto-issue failed:', error);
      }
    }

    res.json({
      progress,
      courseCompleted: isComplete,
      certificate,
      message: completed ? 'Lesson marked as complete.' : 'Lesson marked as incomplete.',
    });
  })
);

router.get(
  '/certificates',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const certificates = await prisma.certificate.findMany({
      where: { userId: req.user.id },
      include: certificateInclude,
      orderBy: { issuedAt: 'desc' },
    });
    res.json({ certificates });
  })
);

router.post(
  '/courses/:courseId/certificate',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const certificate = await issueCertificate(req.user.id, req.params.courseId);
    res.status(201).json({ certificate, message: 'Certificate issued.' });
  })
);

export default router;
