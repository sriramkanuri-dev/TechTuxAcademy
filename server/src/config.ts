import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';

// Also load a root-level .env when running from the monorepo root.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd,
  port: Number(process.env.PORT || 4000),
  databaseUrl: required(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/techtuxacademy?schema=public'
  ),
  jwtSecret: required('JWT_SECRET', isProd ? undefined : 'dev-only-insecure-secret-change-me-please-32'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`,
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'TechTuxAcademy <no-reply@techtuxacademy.online>',
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  uploadDir: path.resolve(__dirname, '../uploads'),
  clientDist: path.resolve(__dirname, '../../client/dist'),
};

if (isProd && config.jwtSecret.includes('dev-only')) {
  throw new Error('JWT_SECRET must be configured in production.');
}
