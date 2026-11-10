import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import type { User } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../db';
import { ApiError, asyncHandler } from './errors';

export const SESSION_COOKIE = 'tta_session';
export const CSRF_COOKIE = 'tta_csrf';

export interface SessionUser {
  id: string;
  role: User['role'];
  name: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Reset/verification tokens are stored as SHA-256 digests, never in plaintext. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signSession(user: Pick<User, 'id' | 'role'>): string {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    issuer: 'techtuxacademy',
    audience: 'techtuxacademy-web',
  });
}

export function verifySession(
  token: string
): { sub: string; role: string; iat: number } | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      issuer: 'techtuxacademy',
      audience: 'techtuxacademy-web',
    }) as jwt.JwtPayload;
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      role: String(payload.role),
      iat: typeof payload.iat === 'number' ? payload.iat : 0,
    };
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.cookieSameSite,
    domain: config.cookieDomain,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
}

export function publicUser(user: User) {
  const {
    passwordHash: _passwordHash,
    emailVerificationToken: _emailVerificationToken,
    passwordResetToken: _passwordResetToken,
    ...safe
  } = user;
  return safe;
}

/** Populates req.user when a valid session cookie is present. Never throws. */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();
  const payload = verifySession(token);
  if (!payload) return next();
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.disabled) return next();

  // A password reset (or change) revokes every session issued before it.
  // 2s of leeway avoids invalidating the token minted immediately afterwards.
  if (user.passwordChangedAt && payload.iat * 1000 + 2000 < user.passwordChangedAt.getTime()) {
    return next();
  }

  req.user = user;
  next();
});

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new ApiError(401, 'You must be signed in to do that.'));
  next();
}

export function requireRole(...roles: User['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, 'You must be signed in to do that.'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
