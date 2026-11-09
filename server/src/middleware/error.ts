import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { ApiError } from '../lib/errors';
import { config } from '../config';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  if (req.path.startsWith('/api')) {
    return next(new ApiError(404, 'API endpoint not found.'));
  }
  next();
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof ApiError) {
    return res.status(error.status).json({
      error: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  if (error instanceof ZodError) {
    return res.status(422).json({
      error: 'Please check the submitted fields.',
      details: error.flatten().fieldErrors,
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(', ') : 'value';
      return res.status(409).json({ error: `That ${target} is already in use.` });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'The requested record no longer exists.' });
    }
    if (error.code === 'P2003') {
      return res.status(409).json({ error: 'This record is still referenced by other data.' });
    }
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'Invalid JSON in request body.' });
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'Image is too large. Maximum size is 5 MB.'
        : 'Image upload failed. Please try a different file.';
    return res.status(400).json({ error: message });
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  if (config.env !== 'production') console.error('[error]', error);

  res.status(500).json({
    error: config.isProd ? 'Something went wrong. Please try again.' : message,
  });
}
