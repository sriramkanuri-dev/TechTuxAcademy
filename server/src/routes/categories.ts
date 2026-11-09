import { Router } from 'express';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../lib/errors';
import { categorySchema, validate } from '../lib/validation';
import { uniqueSlug } from '../lib/slug';
import { requireAdmin } from '../lib/auth';

const router = Router();

const publishedCounts = {
  courses: { where: { published: true } },
  tutorials: { where: { published: true } },
  posts: { where: { published: true } },
} as const;

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: { _count: { select: publishedCounts } },
    });
    res.json({ categories });
  })
);

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: {
        _count: { select: publishedCounts },
        courses: {
          where: { published: true },
          orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
          include: {
            category: { select: { id: true, name: true, slug: true, color: true, icon: true } },
            instructor: { select: { id: true, name: true, avatar: true } },
            _count: { select: { lessons: true, enrollments: true } },
          },
        },
        tutorials: {
          where: { published: true },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: {
            id: true,
            slug: true,
            title: true,
            titleTe: true,
            excerpt: true,
            image: true,
            readMinutes: true,
            createdAt: true,
            author: { select: { name: true } },
          },
        },
        posts: {
          where: { published: true },
          orderBy: { publishedAt: 'desc' },
          take: 6,
          select: {
            id: true,
            slug: true,
            title: true,
            titleTe: true,
            excerpt: true,
            coverImage: true,
            readMinutes: true,
            publishedAt: true,
            author: { select: { name: true } },
          },
        },
      },
    });
    if (!category) throw new ApiError(404, 'Category not found.');
    res.json({ category });
  })
);

// ── Admin ─────────────────────────────────────────────────────────────
router.get(
  '/admin/all',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { courses: true, tutorials: true, posts: true } } },
    });
    res.json({ categories });
  })
);

router.post(
  '/admin',
  requireAdmin,
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const body = req.body;
    const slug =
      body.slug ||
      (await uniqueSlug(body.name, async (candidate) =>
        Boolean(await prisma.category.findUnique({ where: { slug: candidate } }))
      ));
    const category = await prisma.category.create({
      data: {
        name: body.name,
        nameTe: body.nameTe ?? null,
        slug,
        description: body.description,
        descriptionTe: body.descriptionTe ?? null,
        icon: body.icon ?? 'Cpu',
        color: body.color ?? '#8b5cf6',
        order: body.order ?? 0,
        featured: body.featured ?? false,
      },
    });
    res.status(201).json({ category, message: 'Category created.' });
  })
);

router.put(
  '/admin/:id',
  requireAdmin,
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const body = req.body;
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'Category not found.');
    const category = await prisma.category.update({
      where: { id: existing.id },
      data: {
        ...body,
        slug: body.slug || existing.slug,
      },
    });
    res.json({ category, message: 'Category updated.' });
  })
);

router.delete(
  '/admin/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const counts = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { courses: true, tutorials: true, posts: true } } },
    });
    if (!counts) throw new ApiError(404, 'Category not found.');
    if (counts._count.courses + counts._count.tutorials + counts._count.posts > 0) {
      throw new ApiError(409, 'Move or delete the content in this category first.');
    }
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ message: 'Category deleted.' });
  })
);

export default router;
