import { prisma } from '../db';

export interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
  percent: number;
  completedLessonIds: string[];
  nextLessonId: string | null;
}

export async function getCourseProgress(userId: string, courseId: string): Promise<CourseProgress> {
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    select: { id: true },
  });

  if (lessons.length === 0) {
    return {
      totalLessons: 0,
      completedLessons: 0,
      percent: 0,
      completedLessonIds: [],
      nextLessonId: null,
    };
  }

  const progress = await prisma.lessonProgress.findMany({
    where: {
      userId,
      completed: true,
      lessonId: { in: lessons.map((lesson) => lesson.id) },
    },
    select: { lessonId: true },
  });

  const completedIds = new Set(progress.map((row) => row.lessonId));
  const completedLessons = lessons.filter((lesson) => completedIds.has(lesson.id)).length;
  const percent = Math.round((completedLessons / lessons.length) * 100);
  const nextLesson = lessons.find((lesson) => !completedIds.has(lesson.id));

  return {
    totalLessons: lessons.length,
    completedLessons,
    percent,
    completedLessonIds: [...completedIds],
    nextLessonId: nextLesson?.id ?? null,
  };
}

export async function recomputeCourseDuration(courseId: string) {
  const aggregate = await prisma.lesson.aggregate({
    where: { courseId },
    _sum: { durationMinutes: true },
  });
  await prisma.course.update({
    where: { id: courseId },
    data: { durationMinutes: aggregate._sum.durationMinutes ?? 0 },
  });
}
