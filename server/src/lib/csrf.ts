import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { ApiError } from './errors';
import { CSRF_COOKIE } from './auth';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: config.isProd,
    sameSite: (process.env.COOKIE_SAMESITE || 'lax') as 'lax' | 'strict' | 'none',
    domain: config.cookieDomain,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

/** Issues a double-submit CSRF cookie on every request if missing. */
export function issueCsrfToken(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE, token, csrfCookieOptions());
  }
  res.locals.csrfToken = token;
  next();
}

/** Rejects state-changing requests without a matching CSRF header. */
export function verifyCsrfToken(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) {
    return next(new ApiError(403, 'Invalid or missing CSRF token. Refresh the page and try again.'));
  }
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return next(new ApiError(403, 'Invalid or missing CSRF token. Refresh the page and try again.'));
  }
  next();
}
