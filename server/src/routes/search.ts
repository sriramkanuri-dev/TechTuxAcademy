import { Router } from 'express';
import { prisma } from '../db';
import { asyncHandler } from '../lib/errors';

const router = Router();

router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const type = String(req.query.type || 'all');
    const limit = Math.min(24, Math.max(3, Number(req.query.limit) || 8));

    if (q.length < 2) {
      return res.json({
        query: q,
        courses: [],
        tutorials: [],
        posts: [],
        categories: [],
        totals: { courses: 0, tutorials: 0, posts: 0, categories: 0 },
      });
    }

    const like = { contains: q, mode: 'insensitive' as const };
    const want = (name: string) => type === 'all' || type === name;

    const [courses, tutorials, posts, categories] = await Promise.all([
      want('courses')
        ? prisma.course.findMany({
            where: {
              published: true,
              OR: [{ title: like }, { description: like }, { tags: { has: q.toLowerCase() } }],
            },
            select: {
              id: true,
              slug: true,
              title: true,
              titleTe: true,
              description: true,
              thumbnail: true,
              difficulty: true,
              durationMinutes: true,
              category: { select: { name: true, slug: true, color: true } },
              instructor: { select: { name: true } },
              _count: { select: { lessons: true } },
            },
            take: limit,
          })
        : Promise.resolve([]),
      want('tutorials')
        ? prisma.tutorial.findMany({
            where: { published: true, OR: [{ title: like }, { excerpt: like }, { tags: { has: q.toLowerCase() } }] },
            select: {
              id: true,
              slug: true,
              title: true,
              titleTe: true,
              excerpt: true,
              image: true,
              readMinutes: true,
              category: { select: { name: true, slug: true, color: true } },
            },
            take: limit,
          })
        : Promise.resolve([]),
      want('posts')
        ? prisma.blogPost.findMany({
            where: { published: true, OR: [{ title: like }, { excerpt: like }, { tags: { has: q.toLowerCase() } }] },
            select: {
              id: true,
              slug: true,
              title: true,
              titleTe: true,
              excerpt: true,
              coverImage: true,
              readMinutes: true,
              publishedAt: true,
              category: { select: { name: true, slug: true, color: true } },
            },
            take: limit,
          })
        : Promise.resolve([]),
      want('categories')
        ? prisma.category.findMany({
            where: { OR: [{ name: like }, { description: like }] },
            select: {
              id: true,
              slug: true,
              name: true,
              nameTe: true,
              description: true,
              color: true,
              icon: true,
              _count: { select: { courses: { where: { published: true } }, tutorials: { where: { published: true } } } },
            },
            take: limit,
          })
        : Promise.resolve([]),
    ]);

    res.json({ query: q, courses, tutorials, posts, categories });
  })
);

router.get(
  '/search/suggest',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ suggestions: [] });
    const like = { contains: q, mode: 'insensitive' as const };

    const [courses, tutorials, posts, categories] = await Promise.all([
      prisma.course.findMany({
        where: { published: true, OR: [{ title: like }, { tags: { has: q.toLowerCase() } }] },
        select: { slug: true, title: true, difficulty: true },
        take: 4,
      }),
      prisma.tutorial.findMany({
        where: { published: true, OR: [{ title: like }, { excerpt: like }] },
        select: { slug: true, title: true },
        take: 3,
      }),
      prisma.blogPost.findMany({
        where: { published: true, OR: [{ title: like }, { excerpt: like }] },
        select: { slug: true, title: true },
        take: 3,
      }),
      prisma.category.findMany({
        where: { name: like },
        select: { slug: true, name: true },
        take: 3,
      }),
    ]);

    res.json({
      suggestions: [
        ...courses.map((row) => ({ type: 'course', label: row.title, slug: row.slug, meta: row.difficulty })),
        ...tutorials.map((row) => ({ type: 'tutorial', label: row.title, slug: row.slug, meta: 'Tutorial' })),
        ...posts.map((row) => ({ type: 'article', label: row.title, slug: row.slug, meta: 'Article' })),
        ...categories.map((row) => ({ type: 'category', label: row.name, slug: row.slug, meta: 'Category' })),
      ].slice(0, 9),
    });
  })
);

export default router;
