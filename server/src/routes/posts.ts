import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../lib/errors';
import { requireAdmin } from '../lib/auth';
import { postSchema, postUpdateSchema, validate } from '../lib/validation';
import { uniqueSlug } from '../lib/slug';

const router = Router();

const cardInclude = {
  category: { select: { id: true, name: true, nameTe: true, slug: true, color: true, icon: true } },
  author: { select: { id: true, name: true, avatar: true, bio: true } },
} satisfies Prisma.BlogPostInclude;

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

    const where: Prisma.BlogPostWhereInput = { published: true };
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

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: cardInclude,
        orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);
    res.json({
      posts,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  })
);

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.findUnique({
      where: { slug: req.params.slug },
      include: cardInclude,
    });
    if (!post || (!post.published && req.user?.role !== 'ADMIN')) {
      throw new ApiError(404, 'Article not found.');
    }
    const related = await prisma.blogPost.findMany({
      where: { published: true, NOT: { id: post.id }, ...(post.categoryId ? { categoryId: post.categoryId } : {}) },
      include: cardInclude,
      orderBy: { publishedAt: 'desc' },
      take: 3,
    });
    res.json({ post, related });
  })
);

// ── Admin ─────────────────────────────────────────────────────────────
router.get(
  '/admin/all',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const search = String(req.query.search || '').trim();
    const where: Prisma.BlogPostWhereInput = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: cardInclude,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);
    res.json({
      posts,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  })
);

router.get(
  '/admin/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!post) throw new ApiError(404, 'Article not found.');
    res.json({ post });
  })
);

router.post(
  '/admin/create',
  requireAdmin,
  validate(postSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const body = req.body;
    if (body.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
      if (!category) throw new ApiError(422, 'Choose a valid category.');
    }
    const slug =
      body.slug ||
      (await uniqueSlug(body.title, async (candidate) =>
        Boolean(await prisma.blogPost.findUnique({ where: { slug: candidate } }))
      ));

    const post = await prisma.blogPost.create({
      data: {
        title: body.title,
        titleTe: body.titleTe ?? null,
        slug,
        excerpt: body.excerpt,
        excerptTe: body.excerptTe ?? null,
        content: body.content,
        contentTe: body.contentTe ?? null,
        coverImage: body.coverImage ?? null,
        categoryId: body.categoryId ?? null,
        authorId: req.user.id,
        published: body.published ?? false,
        featured: body.featured ?? false,
        readMinutes: body.readMinutes ?? 6,
        language: body.language ?? 'en',
        tags: body.tags ?? [],
        publishedAt: body.publishedAt ?? new Date(),
      },
      include: cardInclude,
    });
    res.status(201).json({ post, message: 'Article created.' });
  })
);

router.put(
  '/admin/:id',
  requireAdmin,
  validate(postUpdateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'Article not found.');
    const body = req.body;
    let slug = existing.slug;
    if (body.slug && body.slug !== existing.slug) {
      slug = await uniqueSlug(body.slug, async (candidate) =>
        Boolean(await prisma.blogPost.findFirst({ where: { slug: candidate, NOT: { id: existing.id } } }))
      );
    }
    const post = await prisma.blogPost.update({
      where: { id: existing.id },
      data: { ...body, slug },
      include: cardInclude,
    });
    res.json({ post, message: 'Article updated.' });
  })
);

router.delete(
  '/admin/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.blogPost.delete({ where: { id: req.params.id } });
    res.json({ message: 'Article deleted.' });
  })
);

export default router;
