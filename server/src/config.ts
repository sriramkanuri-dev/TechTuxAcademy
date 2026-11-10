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

const databaseUrl = required(
  'DATABASE_URL',
  'postgresql://postgres:postgres@localhost:5432/techtuxacademy?schema=public'
);

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd,
  port: Number(process.env.PORT || 4000),
  databaseUrl,
  jwtSecret: required('JWT_SECRET', isProd ? undefined : 'dev-only-insecure-secret-change-me-please-32'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl:
    process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`,
  publicSiteUrl:
    process.env.PUBLIC_SITE_URL ||
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    'http://localhost:5173',
  /**
   * Base URL used inside emails. Defaults to the canonical public site, but can
   * be overridden (e.g. to the *.pages.dev host) when a DNS redirect currently
   * drops paths on the canonical domain.
   */
  emailLinkBase:
    process.env.EMAIL_LINK_URL ||
    process.env.PUBLIC_SITE_URL ||
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    'http://localhost:5173',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  cookieSameSite: (process.env.COOKIE_SAMESITE || 'lax') as 'lax' | 'strict' | 'none',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    // EMAIL_FROM is accepted as an alias so both operator conventions work.
    from:
      process.env.EMAIL_FROM ||
      process.env.MAIL_FROM ||
      'TechTuxAcademy <no-reply@techtuxacademy.online>',
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.resolve(__dirname, '../uploads')),
  clientDist: path.resolve(__dirname, '../../client/dist'),
  resourceStorageDir: path.resolve(
    process.env.RESOURCE_STORAGE_DIR || path.resolve(__dirname, '../../storage')
  ),
  resourceFontDir: path.resolve(__dirname, '../assets/fonts'),
  autoGenerateResources: process.env.AUTO_GENERATE_RESOURCES !== 'false',
};

if (isProd && config.jwtSecret.includes('dev-only')) {
  throw new Error('JWT_SECRET must be configured in production.');
}

if (isProd && config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}

// Fail fast instead of booting a production server that cannot reach its database.
if (isProd && (config.databaseUrl.includes('{project-ref}') || config.databaseUrl.includes('***'))) {
  throw new Error(
    'DATABASE_URL still contains placeholder text. Set the real Supabase pooled connection string (Project Settings → Database → Connection string → URI).'
  );
}

if (!['lax', 'strict', 'none'].includes(config.cookieSameSite)) {
  throw new Error('COOKIE_SAMESITE must be one of: lax, strict, none.');
}

if (isProd && config.cookieSameSite === 'none' && !config.clientUrl.startsWith('https://')) {
  throw new Error('COOKIE_SAMESITE=none requires an HTTPS CLIENT_URL.');
}
