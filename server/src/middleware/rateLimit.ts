import rateLimit from 'express-rate-limit';
import { config } from '../config';

const disabled = config.env === 'test';

function make(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => disabled,
    message: { error: message },
  });
}

export const apiLimiter = make(15 * 60 * 1000, 1200, 'Too many requests. Please slow down.');
export const authLimiter = make(
  15 * 60 * 1000,
  40,
  'Too many authentication attempts. Please try again later.'
);
export const formLimiter = make(
  15 * 60 * 1000,
  20,
  'Too many submissions. Please wait a few minutes and try again.'
);
