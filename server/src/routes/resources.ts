import { Router } from 'express';
import { ResourceStatus } from '@prisma/client';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../lib/errors';
import { requireAuth } from '../lib/auth';
import { absoluteResourcePath, resourceFileExists } from '../services/resources/storage';
import { getLessonResourceViews, resourceView } from '../services/resources/generator';

const router = Router();
router.use(requireAuth);

async function assertLessonAccess(userId: string, role: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true, course: { select: { instructorId: true, published: true } } },
  });
  if (!lesson) throw new ApiError(404, 'Lesson not found.');

  if (role === 'ADMIN') return lesson;
  if (role === 'INSTRUCTOR' && lesson.course.instructorId === userId) return lesson;

  if (!lesson.course.published) throw new ApiError(404, 'Lesson not found.');

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: lesson.courseId } },
    select: { id: true },
  });
  if (!enrollment) throw new ApiError(403, 'Enrol in this course to access its learning resources.');
  return lesson;
}

async function assertResourceAccess(
  userId: string,
  role: string,
  resourceId: string
) {
  const resource = await prisma.lessonResource.findUnique({
    where: { id: resourceId },
    include: {
      lesson: {
        select: {
          id: true,
          courseId: true,
          course: { select: { instructorId: true, published: true } },
        },
      },
    },
  });
  if (!resource) throw new ApiError(404, 'Resource not found.');

  if (role !== 'ADMIN') {
    const isOwner = role === 'INSTRUCTOR' && resource.lesson.course.instructorId === userId;
    if (!isOwner) {
      if (!resource.lesson.course.published) throw new ApiError(404, 'Resource not found.');
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: resource.lesson.courseId } },
        select: { id: true },
      });
      if (!enrollment) throw new ApiError(403, 'Enrol in this course to access its learning resources.');
    }
  }

  return resource;
}

// List the downloadable resources attached to one lesson.
router.get(
  '/lesson/:lessonId',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    await assertLessonAccess(req.user.id, req.user.role, req.params.lessonId);
    const resources = await getLessonResourceViews(req.params.lessonId);
    res.json({ resources });
  })
);

// Stream or download a generated PDF. Files are never served as public static assets.
router.get(
  '/:id/file',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const resource = await assertResourceAccess(req.user.id, req.user.role, req.params.id);

    if (resource.status !== ResourceStatus.READY || !resource.storagePath) {
      throw new ApiError(409, 'This resource is not ready yet. Please try again shortly.');
    }

    const absolute = absoluteResourcePath(resource.storagePath);
    if (!resourceFileExists(absolute)) {
      throw new ApiError(410, 'The generated file is missing. An administrator must regenerate it.');
    }

    const download = req.query.download === '1' || req.query.download === 'true';
    const disposition = download ? 'attachment' : 'inline';
    res.setHeader('Content-Type', resource.mimeType || 'application/pdf');
    res.setHeader('Content-Length', String(resource.fileSize || 0));
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${resource.fileName.replace(/"/g, '')}"`
    );
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.sendFile(absolute, (error) => {
      if (error && !res.headersSent) {
        res.status(500).json({ error: 'Could not send the resource file.' });
      }
    });
  })
);

// Convenience endpoint for the admin editor to preview a lesson's resources as a student would.
router.get(
  '/lesson/:lessonId/status',
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const lesson = await assertLessonAccess(req.user.id, req.user.role, req.params.lessonId);
    const resources = await prisma.lessonResource.findMany({
      where: { lessonId: lesson.id },
      orderBy: { resourceType: 'asc' },
    });
    res.json({
      lessonId: lesson.id,
      resources: resources.map((resource) => ({
        ...resourceView(resource),
        fileExists: resource.storagePath ? resourceFileExists(absoluteResourcePath(resource.storagePath)) : false,
      })),
    });
  })
);

export default router;
