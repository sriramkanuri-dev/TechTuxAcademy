import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../lib/errors';
import { requireAdmin } from '../lib/auth';
import { tutorialSchema, tutorialUpdateSchema, validate } from '../lib/validation';
import { uniqueSlug } from '../lib/slug';

const router = Router();

const cardInclude = {
  category: { select: { id: true, name: true, nameTe: true, slug: true, color: true, icon: true } },
  author: { select: { id: true, name: true, avatar: true, bio: true } },
} satisfies Prisma.TutorialInclude;

function pagination(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(48, Math.max(1, Number(query.limit) || 9));
  return { page, limit, skip: (page - 1) * limit };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();
    const tag = String(req.query.tag || '').trim();
    const featured = req.query.featured === 'true';

    const where: Prisma.TutorialWhereInput = { published: true };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ];
    }
    if (category) where.category = { slug: category };
    if (tag) where.tags = { has: tag.toLowerCase() };
    if (featured) where.featured = true;

    const [tutorials, total] = await Promise.all([
      prisma.tutorial.findMany({
        where,
        include: cardInclude,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.tutorial.count({ where }),
    ]);

    res.json({
      tutorials,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  })
);

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const tutorial = await prisma.tutorial.findUnique({
      where: { slug: req.params.slug },
      include: cardInclude,
    });
    if (!tutorial || (!tutorial.published && req.user?.role !== 'ADMIN')) {
      throw new ApiError(404, 'Tutorial not found.');
    }
    const related = await prisma.tutorial.findMany({
      where: { published: true, categoryId: tutorial.categoryId, NOT: { id: tutorial.id } },
      include: { category: true, author: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    res.json({ tutorial, related });
  })
);

// ── Admin ─────────────────────────────────────────────────────────────
router.get(
  '/admin/all',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const search = String(req.query.search || '').trim();
    const where: Prisma.TutorialWhereInput = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [tutorials, total] = await Promise.all([
      prisma.tutorial.findMany({
        where,
        include: cardInclude,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tutorial.count({ where }),
    ]);
    res.json({
      tutorials,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  })
);

router.get(
  '/admin/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const tutorial = await prisma.tutorial.findUnique({ where: { id: req.params.id } });
    if (!tutorial) throw new ApiError(404, 'Tutorial not found.');
    res.json({ tutorial });
  })
);

router.post(
  '/admin/create',
  requireAdmin,
  validate(tutorialSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const body = req.body;
    const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!category) throw new ApiError(422, 'Choose a valid category.');

    const slug =
      body.slug ||
      (await uniqueSlug(body.title, async (candidate) =>
        Boolean(await prisma.tutorial.findUnique({ where: { slug: candidate } }))
      ));

    const tutorial = await prisma.tutorial.create({
      data: {
        title: body.title,
        titleTe: body.titleTe ?? null,
        slug,
        excerpt: body.excerpt,
        excerptTe: body.excerptTe ?? null,
        content: body.content,
        contentTe: body.contentTe ?? null,
        image: body.image ?? null,
        categoryId: body.categoryId,
        authorId: req.user.id,
        published: body.published ?? false,
        featured: body.featured ?? false,
        readMinutes: body.readMinutes ?? 5,
        language: body.language ?? 'en',
        tags: body.tags ?? [],
      },
      include: cardInclude,
    });
    res.status(201).json({ tutorial, message: 'Tutorial created.' });
  })
);

router.put(
  '/admin/:id',
  requireAdmin,
  validate(tutorialUpdateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.tutorial.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'Tutorial not found.');
    const body = req.body;
    let slug = existing.slug;
    if (body.slug && body.slug !== existing.slug) {
      slug = await uniqueSlug(body.slug, async (candidate) =>
        Boolean(await prisma.tutorial.findFirst({ where: { slug: candidate, NOT: { id: existing.id } } }))
      );
    }
    const tutorial = await prisma.tutorial.update({
      where: { id: existing.id },
      data: { ...body, slug },
      include: cardInclude,
    });
    res.json({ tutorial, message: 'Tutorial updated.' });
  })
);

router.delete(
  '/admin/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.tutorial.delete({ where: { id: req.params.id } });
    res.json({ message: 'Tutorial deleted.' });
  })
);

export default router;
