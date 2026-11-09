import crypto from 'crypto';
import { prisma } from '../db';
import { ApiError } from '../lib/errors';
import { getCourseProgress } from './learning';

function newCertificateId() {
  const year = new Date().getFullYear();
  return `TTA-${year}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

async function createUniqueCertificateId(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const id = newCertificateId();
    const existing = await prisma.certificate.findUnique({ where: { certificateId: id } });
    if (!existing) return id;
  }
  throw new ApiError(500, 'Could not allocate a certificate ID. Please try again.');
}

export const certificateInclude = {
  user: { select: { id: true, name: true, email: true } },
  course: {
    select: {
      id: true,
      title: true,
      titleTe: true,
      slug: true,
      difficulty: true,
      category: { select: { name: true, color: true } },
    },
  },
} as const;

export async function issueCertificate(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, certificateThreshold: true, published: true },
  });
  if (!course) throw new ApiError(404, 'Course not found.');

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) {
    throw new ApiError(403, 'Enroll in this course before requesting a certificate.');
  }

  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: certificateInclude,
  });
  if (existing) return existing;

  const progress = await getCourseProgress(userId, courseId);
  if (progress.percent < course.certificateThreshold) {
    throw new ApiError(400, 'Course completion requirements are not met yet.', {
      requiredPercent: course.certificateThreshold,
      currentPercent: progress.percent,
      remainingLessons: progress.totalLessons - progress.completedLessons,
    });
  }

  return prisma.certificate.create({
    data: {
      certificateId: await createUniqueCertificateId(),
      userId,
      courseId,
    },
    include: certificateInclude,
  });
}

export async function getPublicCertificate(certificateId: string) {
  return prisma.certificate.findUnique({
    where: { certificateId },
    include: certificateInclude,
  });
}

export function verificationUrl(certificateId: string) {
  const base = process.env.CLIENT_URL || 'http://localhost:5173';
  return `${base}/verify-certificate/${certificateId}`;
}
