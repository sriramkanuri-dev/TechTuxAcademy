import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import { ApiError } from './errors';

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(200);
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(100)
  .regex(/[A-Za-z]/, 'Password must include a letter.')
  .regex(/[0-9]/, 'Password must include a number.');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  email,
  password,
  preferredLanguage: z.enum(['en', 'te']).optional(),
});

export const loginSchema = z.object({ email, password: z.string().min(1).max(100) });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(20), password });
export const changePasswordSchema = z.object({
  currentPassword: z.string().max(100).optional(),
  newPassword: password,
});
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  bio: z.string().max(600).optional().nullable(),
  bioTe: z.string().max(600).optional().nullable(),
  avatar: z.string().max(500).optional().nullable(),
  preferredLanguage: z.enum(['en', 'te']).optional(),
});
export const googleSchema = z.object({ credential: z.string().min(20) });

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  nameTe: z.string().trim().max(120).optional().nullable(),
  slug: z.string().trim().max(90).optional(),
  description: z.string().trim().min(10).max(2000),
  descriptionTe: z.string().trim().max(2000).optional().nullable(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  order: z.coerce.number().int().min(0).max(999).optional(),
  featured: z.boolean().optional(),
});

const resourceSchema = z.object({
  title: z.string().trim().min(1).max(160),
  url: z.string().url(),
  type: z.string().max(30).optional(),
});

export const courseSchema = z.object({
  title: z.string().trim().min(3).max(140),
  titleTe: z.string().trim().max(200).optional().nullable(),
  slug: z.string().trim().max(120).optional(),
  description: z.string().trim().min(20).max(600),
  descriptionTe: z.string().trim().max(800).optional().nullable(),
  longDescription: z.string().max(20000).optional().nullable(),
  longDescriptionTe: z.string().max(20000).optional().nullable(),
  thumbnail: z.string().max(500).optional().nullable(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  durationMinutes: z.coerce.number().int().min(0).max(100000).optional(),
  language: z.enum(['en', 'te']).optional(),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
  certificateThreshold: z.coerce.number().int().min(1).max(100).optional(),
  objectives: z.array(z.string().trim().min(1).max(300)).max(30).optional(),
  objectivesTe: z.array(z.string().trim().min(1).max(300)).max(30).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
  requirements: z.array(z.string().trim().min(1).max(300)).max(30).optional(),
  categoryId: z.string().min(1),
  instructorId: z.string().min(1).optional(),
});

export const courseUpdateSchema = courseSchema.partial().extend({
  categoryId: z.string().min(1).optional(),
});

export const lessonSchema = z.object({
  title: z.string().trim().min(2).max(160),
  titleTe: z.string().trim().max(200).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  descriptionTe: z.string().max(5000).optional().nullable(),
  youtubeUrl: z.string().trim().min(5).max(500),
  durationMinutes: z.coerce.number().int().min(0).max(1000).optional(),
  order: z.coerce.number().int().min(0).max(10000).optional(),
  isPreview: z.boolean().optional(),
  resources: z.array(resourceSchema).max(20).optional().nullable(),
});

export const lessonUpdateSchema = lessonSchema.partial();

export const tutorialSchema = z.object({
  title: z.string().trim().min(3).max(160),
  titleTe: z.string().trim().max(220).optional().nullable(),
  slug: z.string().trim().max(140).optional(),
  excerpt: z.string().trim().min(10).max(500),
  excerptTe: z.string().trim().max(600).optional().nullable(),
  content: z.string().min(20).max(200000),
  contentTe: z.string().max(200000).optional().nullable(),
  image: z.string().max(500).optional().nullable(),
  categoryId: z.string().min(1),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
  readMinutes: z.coerce.number().int().min(1).max(300).optional(),
  language: z.enum(['en', 'te']).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
});
export const tutorialUpdateSchema = tutorialSchema.partial();

export const postSchema = z.object({
  title: z.string().trim().min(3).max(160),
  titleTe: z.string().trim().max(220).optional().nullable(),
  slug: z.string().trim().max(140).optional(),
  excerpt: z.string().trim().min(10).max(500),
  excerptTe: z.string().trim().max(600).optional().nullable(),
  content: z.string().min(20).max(200000),
  contentTe: z.string().max(200000).optional().nullable(),
  coverImage: z.string().max(500).optional().nullable(),
  categoryId: z.string().min(1).optional().nullable(),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
  readMinutes: z.coerce.number().int().min(1).max(300).optional(),
  language: z.enum(['en', 'te']).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
  publishedAt: z.coerce.date().optional(),
});
export const postUpdateSchema = postSchema.partial();

export const testimonialSchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().min(2).max(120),
  quote: z.string().trim().min(10).max(1000),
  quoteTe: z.string().trim().max(1200).optional().nullable(),
  avatar: z.string().max(500).optional().nullable(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
  order: z.coerce.number().int().min(0).max(999).optional(),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(2).max(140),
  message: z.string().trim().min(2).max(1000),
  messageTe: z.string().trim().max(1200).optional().nullable(),
  type: z.enum(['info', 'success', 'warning', 'danger']).optional(),
  active: z.boolean().optional(),
  link: z.string().max(500).optional().nullable(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(5000),
});

export const newsletterSchema = z.object({
  email,
  name: z.string().trim().max(80).optional(),
});

export const adminUserSchema = z.object({
  role: z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN']).optional(),
  disabled: z.boolean().optional(),
  name: z.string().trim().min(2).max(80).optional(),
});

export const settingsSchema = z.record(
  z.string().min(1).max(100),
  z.union([z.string().max(20000), z.number(), z.boolean(), z.null()])
);

export const reorderSchema = z.object({
  lessonIds: z.array(z.string().min(1)).min(1).max(500),
});

export function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new ApiError(422, 'Please check the highlighted fields.', result.error.flatten().fieldErrors)
      );
    }
    req.body = result.data;
    next();
  };
}
