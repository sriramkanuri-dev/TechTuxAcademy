import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../lib/errors';
import { requireAdmin } from '../lib/auth';
import {
  adminUserSchema,
  announcementSchema,
  settingsSchema,
  testimonialSchema,
  validate,
} from '../lib/validation';
import { certificateInclude } from '../services/certificates';
import { parseSettings } from './site';

const router = Router();
router.use(requireAdmin);

function pagination(query: Record<string, unknown>, defaultLimit = 15) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

// ── Overview ──────────────────────────────────────────────────────────
router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [
      students,
      instructors,
      totalCourses,
      publishedCourses,
      totalTutorials,
      publishedTutorials,
      totalPosts,
      publishedPosts,
      totalLessons,
      enrollments,
      certificates,
      newsletterSubscribers,
      unhandledMessages,
      recentRegistrations,
      recentEnrollments,
      recentCertificates,
      topCourses,
      recentMessages,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
      prisma.course.count(),
      prisma.course.count({ where: { published: true } }),
      prisma.tutorial.count(),
      prisma.tutorial.count({ where: { published: true } }),
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { published: true } }),
      prisma.lesson.count(),
      prisma.enrollment.count(),
      prisma.certificate.count({ where: { revoked: false } }),
      prisma.newsletterSubscriber.count({ where: { active: true } }),
      prisma.contactMessage.count({ where: { handled: false } }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, name: true, email: true, role: true, createdAt: true, avatar: true },
      }),
      prisma.enrollment.findMany({
        orderBy: { enrolledAt: 'desc' },
        take: 6,
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true, slug: true } },
        },
      }),
      prisma.certificate.findMany({
        orderBy: { issuedAt: 'desc' },
        take: 5,
        include: certificateInclude,
      }),
      prisma.course.findMany({
        include: {
          _count: { select: { enrollments: true, lessons: true } },
          category: { select: { name: true, color: true } },
        },
        orderBy: { enrollments: { _count: 'desc' } },
        take: 5,
      }),
      prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    res.json({
      stats: {
        students,
        instructors,
        totalCourses,
        publishedCourses,
        totalTutorials,
        publishedTutorials,
        totalPosts,
        publishedPosts,
        totalLessons,
        enrollments,
        certificates,
        newsletterSubscribers,
        unhandledMessages,
      },
      recentRegistrations,
      recentEnrollments,
      recentCertificates,
      topCourses,
      recentMessages,
    });
  })
);

// ── Users ─────────────────────────────────────────────────────────────
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const search = String(req.query.search || '').trim();
    const role = String(req.query.role || '').trim();
    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role && ['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(role)) {
      where.role = role as 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          disabled: true,
          emailVerified: true,
          avatar: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { enrollments: true, certificates: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    res.json({
      users,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  })
);

router.get(
  '/instructors',
  asyncHandler(async (_req, res) => {
    const instructors = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'INSTRUCTOR'] }, disabled: false },
      select: { id: true, name: true, email: true, avatar: true },
      orderBy: { name: 'asc' },
    });
    res.json({ instructors });
  })
);

router.patch(
  '/users/:id',
  validate(adminUserSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new ApiError(404, 'User not found.');

    const body = req.body;
    if (target.id === req.user.id && (body.disabled === true || (body.role && body.role !== 'ADMIN'))) {
      throw new ApiError(400, 'You cannot disable or demote your own admin account.');
    }
    if (
      target.role === 'ADMIN' &&
      ((body.role !== undefined && body.role !== 'ADMIN') || body.disabled === true)
    ) {
      const admins = await prisma.user.count({ where: { role: 'ADMIN', disabled: false } });
      if (admins <= 1) throw new ApiError(400, 'At least one active administrator is required.');
    }

    const user = await prisma.user.update({
      where: { id: target.id },
      data: body,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        disabled: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    res.json({ user, message: 'User updated.' });
  })
);

// ── Certificates ──────────────────────────────────────────────────────
router.get(
  '/certificates',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    const where: Prisma.CertificateWhereInput = {};
    if (status === 'valid') where.revoked = false;
    if (status === 'revoked') where.revoked = true;
    if (search) {
      where.OR = [
        { certificateId: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { course: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        include: certificateInclude,
        orderBy: { issuedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.certificate.count({ where }),
    ]);
    res.json({
      certificates,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  })
);

router.patch(
  '/certificates/:id/revoke',
  validate(
    z.object({
      revoked: z.boolean(),
      reason: z.string().trim().max(300).optional().nullable(),
    })
  ),
  asyncHandler(async (req, res) => {
    const certificate = await prisma.certificate.update({
      where: { id: req.params.id },
      data: {
        revoked: req.body.revoked,
        revokedAt: req.body.revoked ? new Date() : null,
        revocationReason: req.body.revoked ? req.body.reason ?? null : null,
      },
      include: certificateInclude,
    });
    res.json({
      certificate,
      message: req.body.revoked ? 'Certificate revoked.' : 'Certificate reinstated.',
    });
  })
);

// ── Enrollments ───────────────────────────────────────────────────────
router.get(
  '/enrollments',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const search = String(req.query.search || '').trim();
    const where: Prisma.EnrollmentWhereInput = search
      ? {
          OR: [
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { course: { title: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};
    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true, slug: true, _count: { select: { lessons: true } } } },
        },
        orderBy: { enrolledAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.enrollment.count({ where }),
    ]);
    res.json({
      enrollments,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  })
);

// ── Testimonials ──────────────────────────────────────────────────────
router.get(
  '/testimonials',
  asyncHandler(async (_req, res) => {
    const testimonials = await prisma.testimonial.findMany({ orderBy: { order: 'asc' } });
    res.json({ testimonials });
  })
);

router.post(
  '/testimonials',
  validate(testimonialSchema),
  asyncHandler(async (req, res) => {
    const testimonial = await prisma.testimonial.create({ data: req.body });
    res.status(201).json({ testimonial, message: 'Testimonial created.' });
  })
);

router.put(
  '/testimonials/:id',
  validate(testimonialSchema),
  asyncHandler(async (req, res) => {
    const testimonial = await prisma.testimonial.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ testimonial, message: 'Testimonial updated.' });
  })
);

router.delete(
  '/testimonials/:id',
  asyncHandler(async (req, res) => {
    await prisma.testimonial.delete({ where: { id: req.params.id } });
    res.json({ message: 'Testimonial deleted.' });
  })
);

// ── Announcements ─────────────────────────────────────────────────────
router.get(
  '/announcements',
  asyncHandler(async (_req, res) => {
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ announcements });
  })
);

router.post(
  '/announcements',
  validate(announcementSchema),
  asyncHandler(async (req, res) => {
    const announcement = await prisma.announcement.create({ data: req.body });
    res.status(201).json({ announcement, message: 'Announcement published.' });
  })
);

router.put(
  '/announcements/:id',
  validate(announcementSchema),
  asyncHandler(async (req, res) => {
    const announcement = await prisma.announcement.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ announcement, message: 'Announcement updated.' });
  })
);

router.delete(
  '/announcements/:id',
  asyncHandler(async (req, res) => {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ message: 'Announcement deleted.' });
  })
);

// ── Website settings ──────────────────────────────────────────────────
router.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.siteSetting.findMany();
    res.json({ settings: parseSettings(rows) });
  })
);

router.put(
  '/settings',
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    const entries = Object.entries(req.body as Record<string, unknown>);
    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.siteSetting.upsert({
          where: { key },
          create: { key, value: JSON.stringify(value) },
          update: { value: JSON.stringify(value) },
        })
      )
    );
    const rows = await prisma.siteSetting.findMany();
    res.json({ settings: parseSettings(rows), message: 'Website settings saved.' });
  })
);

// ── Newsletter & contact inbox ────────────────────────────────────────
router.get(
  '/newsletter',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const [subscribers, total] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.newsletterSubscriber.count(),
    ]);
    res.json({
      subscribers,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  })
);

router.patch(
  '/newsletter/:id',
  validate(z.object({ active: z.boolean() })),
  asyncHandler(async (req, res) => {
    const subscriber = await prisma.newsletterSubscriber.update({
      where: { id: req.params.id },
      data: { active: req.body.active },
    });
    res.json({ subscriber, message: 'Subscriber updated.' });
  })
);

router.delete(
  '/newsletter/:id',
  asyncHandler(async (req, res) => {
    await prisma.newsletterSubscriber.delete({ where: { id: req.params.id } });
    res.json({ message: 'Subscriber removed.' });
  })
);

router.get(
  '/messages',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const status = String(req.query.status || '').trim();
    const where: Prisma.ContactMessageWhereInput = {};
    if (status === 'open') where.handled = false;
    if (status === 'handled') where.handled = true;
    const [messages, total] = await Promise.all([
      prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.contactMessage.count({ where }),
    ]);
    res.json({
      messages,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  })
);

router.patch(
  '/messages/:id',
  validate(z.object({ handled: z.boolean() })),
  asyncHandler(async (req, res) => {
    const message = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: { handled: req.body.handled },
    });
    res.json({ contactMessage: message, message: 'Message updated.' });
  })
);

router.delete(
  '/messages/:id',
  asyncHandler(async (req, res) => {
    await prisma.contactMessage.delete({ where: { id: req.params.id } });
    res.json({ message: 'Message deleted.' });
  })
);

export default router;
