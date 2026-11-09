import { Router } from 'express';
import { prisma } from '../db';
import { asyncHandler } from '../lib/errors';

const router = Router();

export function parseSettings(rows: { key: string; value: string }[]) {
  const settings: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  return settings;
}

const courseCard = {
  category: { select: { id: true, name: true, nameTe: true, slug: true, color: true, icon: true } },
  instructor: { select: { id: true, name: true, avatar: true } },
  _count: { select: { lessons: true, enrollments: true } },
} as const;

const LINUX_SLUGS = ['linux', 'linux-administration', 'arch-linux', 'red-hat-enterprise-linux', 'ubuntu'];

router.get(
  '/home',
  asyncHandler(async (_req, res) => {
    const [
      settingsRows,
      announcements,
      categories,
      featuredCourses,
      latestCourses,
      linuxTutorials,
      tutorials,
      posts,
      testimonials,
      counts,
    ] = await Promise.all([
      prisma.siteSetting.findMany(),
      prisma.announcement.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' }, take: 3 }),
      prisma.category.findMany({
        orderBy: [{ featured: 'desc' }, { order: 'asc' }],
        take: 10,
        include: {
          _count: {
            select: {
              courses: { where: { published: true } },
              tutorials: { where: { published: true } },
              posts: { where: { published: true } },
            },
          },
        },
      }),
      prisma.course.findMany({
        where: { published: true, featured: true },
        include: courseCard,
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.course.findMany({
        where: { published: true },
        include: courseCard,
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.tutorial.findMany({
        where: { published: true, category: { slug: { in: LINUX_SLUGS } } },
        include: {
          category: { select: { name: true, slug: true, color: true } },
          author: { select: { name: true } },
        },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        take: 4,
      }),
      prisma.tutorial.findMany({
        where: { published: true },
        include: {
          category: { select: { name: true, slug: true, color: true } },
          author: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),
      prisma.blogPost.findMany({
        where: { published: true },
        include: {
          category: { select: { name: true, slug: true, color: true } },
          author: { select: { name: true, avatar: true } },
        },
        orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
        take: 4,
      }),
      prisma.testimonial.findMany({
        where: { published: true, featured: true },
        orderBy: { order: 'asc' },
        take: 6,
      }),
      Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.course.count({ where: { published: true } }),
        prisma.lesson.count(),
        prisma.tutorial.count({ where: { published: true } }),
        prisma.blogPost.count({ where: { published: true } }),
        prisma.certificate.count({ where: { revoked: false } }),
        prisma.enrollment.count(),
      ]),
    ]);

    const [students, courses, lessons, tutorialCount, postCount, certificates, enrollments] = counts;

    res.json({
      settings: parseSettings(settingsRows),
      announcements,
      categories,
      featuredCourses: featuredCourses.length ? featuredCourses : latestCourses,
      latestCourses,
      linuxTutorials: linuxTutorials.length ? linuxTutorials : tutorials,
      tutorials,
      posts,
      testimonials,
      stats: {
        students,
        courses,
        lessons,
        tutorials: tutorialCount,
        posts: postCount,
        certificates,
        enrollments,
      },
    });
  })
);

router.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.siteSetting.findMany();
    res.json({ settings: parseSettings(rows) });
  })
);

router.get(
  '/testimonials',
  asyncHandler(async (_req, res) => {
    const testimonials = await prisma.testimonial.findMany({
      where: { published: true },
      orderBy: { order: 'asc' },
    });
    res.json({ testimonials });
  })
);

router.get(
  '/announcements',
  asyncHandler(async (_req, res) => {
    const announcements = await prisma.announcement.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    res.json({ announcements });
  })
);

export async function buildSitemap(baseUrl: string) {
  const [courses, tutorials, posts, categories] = await Promise.all([
    prisma.course.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.tutorial.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.blogPost.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
  ]);

  const staticPaths = [
    '',
    '/about',
    '/courses',
    '/tutorials',
    '/blog',
    '/categories',
    '/contact',
    '/search',
    '/verify-certificate',
    '/login',
    '/register',
  ];

  const entries = [
    ...staticPaths.map((path) => ({ loc: `${baseUrl}${path}`, lastmod: new Date().toISOString() })),
    ...courses.map((row) => ({ loc: `${baseUrl}/courses/${row.slug}`, lastmod: row.updatedAt.toISOString() })),
    ...tutorials.map((row) => ({ loc: `${baseUrl}/tutorials/${row.slug}`, lastmod: row.updatedAt.toISOString() })),
    ...posts.map((row) => ({ loc: `${baseUrl}/blog/${row.slug}`, lastmod: row.updatedAt.toISOString() })),
    ...categories.map((row) => ({ loc: `${baseUrl}/categories/${row.slug}`, lastmod: row.updatedAt.toISOString() })),
  ];

  const body = entries
    .map(
      (entry) =>
        `  <url><loc>${entry.loc}</loc><lastmod>${entry.lastmod.split('T')[0]}</lastmod></url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

export default router;
