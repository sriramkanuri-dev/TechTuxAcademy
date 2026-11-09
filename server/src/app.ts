import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { issueCsrfToken, verifyCsrfToken } from './lib/csrf';
import { authenticate } from './lib/auth';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/error';
import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import courseRoutes from './routes/courses';
import learningRoutes from './routes/learning';
import certificateRoutes from './routes/certificates';
import tutorialRoutes from './routes/tutorials';
import postRoutes from './routes/posts';
import searchRoutes from './routes/search';
import siteRoutes, { buildSitemap } from './routes/site';
import adminRoutes from './routes/admin';
import miscRoutes from './routes/misc';
import uploadRoutes from './routes/uploads';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  const allowedOrigins = [
    config.clientUrl,
    ...(process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
  ];

  app.use(
    helmet({
      contentSecurityPolicy: config.isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", 'https://accounts.google.com', 'https://www.youtube.com'],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
              imgSrc: [
                "'self'",
                'data:',
                'https://i.ytimg.com',
                'https://lh3.googleusercontent.com',
              ],
              frameSrc: [
                'https://www.youtube-nocookie.com',
                'https://www.youtube.com',
                'https://accounts.google.com',
              ],
              connectSrc: ["'self'", 'https://accounts.google.com'],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              frameAncestors: ["'self'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (config.env !== 'production') return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.use('/uploads', express.static(config.uploadDir, { maxAge: '7d', fallthrough: true }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'TechTuxAcademy API', time: new Date().toISOString() });
  });

  // Every API request gets a CSRF cookie; state-changing requests must echo it.
  app.use('/api', issueCsrfToken, authenticate, verifyCsrfToken, apiLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/me', learningRoutes);
  app.use('/api/certificates', certificateRoutes);
  app.use('/api/tutorials', tutorialRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api', searchRoutes);
  app.use('/api/site', siteRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', miscRoutes);
  app.use('/api', uploadRoutes);

  app.get('/sitemap.xml', async (req, res, next) => {
    try {
      const base = (process.env.PUBLIC_SITE_URL || config.clientUrl).replace(/\/$/, '');
      const xml = await buildSitemap(base);
      res.type('application/xml').send(xml);
    } catch (error) {
      next(error);
    }
  });

  app.get('/robots.txt', (req, res) => {
    const base = (process.env.PUBLIC_SITE_URL || config.clientUrl).replace(/\/$/, '');
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\nDisallow: /api\n\nSitemap: ${base}/sitemap.xml\n`
    );
  });

  app.use(notFoundHandler);

  const hasClientBuild = fs.existsSync(path.join(config.clientDist, 'index.html'));
  if (hasClientBuild) {
    app.use(express.static(config.clientDist, { maxAge: '1h', index: false }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(path.join(config.clientDist, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.json({
        name: 'TechTuxAcademy API',
        tagline: 'Learn. Build. Innovate.',
        status: 'running',
        docs: '/api/health',
      });
    });
  }

  app.use(errorHandler);
  return app;
}
