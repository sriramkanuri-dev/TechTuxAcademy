# TechTuxAcademy

**Learn. Build. Innovate.**

A production-ready full-stack technology learning platform: public course catalogue, blog and tutorials, a student learning player with progress tracking, verifiable PDF certificates, and a complete admin dashboard.

- Public site: https://techtuxacademy.online
- Stack: React + Vite + TypeScript + Tailwind CSS · Node/Express REST API · PostgreSQL + Prisma
- Bilingual: English and Telugu (తెలుగు) with a Unicode font stack
- Dark mode by default, optional light mode

---

## Contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Quick start (local)](#quick-start-local)
6. [Environment variables](#environment-variables)
7. [Demo credentials](#demo-credentials)
8. [Scripts](#scripts)
9. [Production build](#production-build)
10. [Docker deployment](#docker-deployment)
11. [Deploying to techtuxacademy.online](#deploying-to-techtuxacademyonline)
12. [API overview](#api-overview)
13. [Testing](#testing)
14. [Security notes](#security-notes)
15. [Content management](#content-management)
16. [Troubleshooting](#troubleshooting)

---

## Features

**Public**
- Homepage with live stats, featured courses, categories, tutorials, testimonials and announcements (all read from the database — no hardcoded numbers).
- Course catalogue with search, category/difficulty/language filters and pagination.
- Course detail with curriculum, preview lessons, objectives, requirements and resources. Full lesson videos are hidden until the learner is enrolled.
- Tutorials and blog with categories, tags, search, related content, reading time, markdown rendering, syntax highlighting and copy-code buttons.
- 20 learning categories, each with a dedicated page.
- Global search with suggestions, filters and empty states.
- Telugu language toggle with original Telugu content where available.
- Public certificate verification by ID (`/verify-certificate/:certificateId`).
- Contact form and newsletter signup.
- SEO: per-page metadata, Open Graph tags, `sitemap.xml`, `robots.txt`, semantic HTML, lazy-loaded routes.

**Students**
- Register, login, logout, email verification, forgot/reset password, profile and password change.
- Dashboard with real enrolment, progress and certificate data.
- Learning player with YouTube embeds, lesson sidebar, watched/completed tracking, resume and course-completion detection.
- Downloadable per-lesson PDFs (lesson notes and command cheat sheets) generated automatically from lesson content.
- Certificates issued automatically at the course threshold; PDF download with QR code and unique ID.

**Admins**
- Live overview stats, analytics, recent activity.
- Course and lesson CRUD (including YouTube URLs, resources, preview flags, publish state).
- Tutorial and blog post CRUD (markdown, Telugu fields, tags, categories, publish state).
- Learning-resources console: generate/regenerate/delete lesson PDFs, mark content outdated, inspect failures and monitor background generation jobs.
- User management: roles, enable/disable, email verification visibility.
- Enrolment reporting.
- Certificate management: revoke/reinstate with reason; revoked certificates fail public verification.
- Category CRUD with icons and colours.
- Website settings: homepage/about copy, contact and social links, announcements, testimonials, newsletter subscribers and the contact inbox.
- All authorisation enforced server-side; disabled accounts are rejected on every request.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 6, TypeScript, Tailwind CSS 3, TanStack Query, React Router, react-markdown, highlight.js |
| Backend | Node.js, Express 4, TypeScript, Zod validation, Prisma 6 |
| Database | PostgreSQL 16 |
| Auth | JWT session in an `httpOnly` cookie, bcrypt password hashing, double-submit CSRF token, RBAC |
| Certificates | PDFKit + QRCode, generated server-side |
| Lesson resources | PDFKit — per-lesson notes and command cheat sheets, generated in a background queue |
| Email | Nodemailer (SMTP); falls back to console preview when SMTP is not configured |
| Uploads | Multer (images) in `UPLOAD_DIR`, generated PDFs in `RESOURCE_STORAGE_DIR`; on Render's free plan these are ephemeral and missing PDFs are regenerated on boot |

---

## Project structure

```
TechTuxAcademy/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # UI primitives, cards, layouts, guards, SEO
│   │   ├── contexts/       # Auth, Theme, Language, Toast
│   │   ├── lib/            # API client, types, utilities
│   │   └── pages/          # public, dashboard and admin pages
│   ├── public/             # _redirects (SPA fallback) + _routes.json (Functions scope)
│   └── vite.config.ts
├── functions/              # Cloudflare Pages Functions: same-origin /api and /uploads proxy
├── server/                 # Express + Prisma backend
│   ├── prisma/             # schema, migrations, seed
│   ├── scripts/            # embedded-Postgres helper, API smoke test
│   ├── src/
│   │   ├── lib/            # auth, CSRF, validation, mailer, slug, errors
│   │   ├── middleware/     # rate limiting, error handling
│   │   ├── routes/         # REST endpoints
│   │   └── services/       # certificate generation
│   └── uploads/            # uploaded images (git-ignored)
├── Dockerfile
├── docker-compose.yml
├── docker-entrypoint.sh
├── deploy/nginx.conf.example
├── .env.example
└── README.md
```

---

## Prerequisites

- **Node.js 20+** (developed and tested on Node 22.11)
- **PostgreSQL 14+** — either:
  - a local/system PostgreSQL, or
  - Docker (`docker compose`), or
  - the bundled `embedded-postgres` helper for local development (no system install required)

> This repository was built in an environment without system PostgreSQL or Docker, so local development used the `embedded-postgres` helper on port `5433`. The Docker Compose stack and production docs use standard PostgreSQL.

---

## Quick start (local)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the environment

```bash
cp .env.example server/.env
```

Edit `server/.env` and set at minimum:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/techtuxacademy?schema=public
JWT_SECRET=<generate a long random string>
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never commit a real `.env`. The application only reads `server/.env` (and an optional root `.env`).

### 3. Start PostgreSQL

**Option A — you already have PostgreSQL**

Create a database matching `DATABASE_URL`:

```bash
createdb techtuxacademy
```

**Option B — Docker**

```bash
docker run --name tta-postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=techtuxacademy -p 5432:5432 -d postgres:16-alpine
```

**Option C — bundled embedded PostgreSQL (no system install)**

```bash
npm run db:start        # starts a real PostgreSQL on localhost:5433
```

Then set the matching URL in `server/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/techtuxacademy?schema=public
```

Stop it later with `npm run db:stop`.

### 4. Apply migrations and seed

```bash
npm run db:generate     # generate the Prisma client
npm run db:migrate      # apply migrations (dev)
npm run db:seed         # create demo content and users
```

For production databases use `npm run db:deploy -w server` instead of `db:migrate`.

### 5. Run in development

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4000
- Vite proxies `/api` and `/uploads` to the API.

---

## Environment variables

All variables live in `server/.env`. See `.env.example` for the full template.

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | no | `development` or `production`. Production enables secure cookies, strict CORS and CSP. |
| `PORT` | no | API port (default `4000`). |
| `DATABASE_URL` | **yes** | PostgreSQL connection string used by the running app. Use a pooled URL (Supabase/Neon) in production. |
| `DIRECT_URL` | for migrations | Direct (non-pooled) PostgreSQL URL used only by Prisma Migrate when `DATABASE_URL` is a pooler. Equal to `DATABASE_URL` for a direct database. |
| `JWT_SECRET` | **yes in prod** | Long random string used to sign sessions. |
| `JWT_EXPIRES_IN` | no | Session lifetime (default `7d`). |
| `CLIENT_URL` | no | Frontend origin (default `http://localhost:5173`). |
| `API_URL` | no | API origin used in logs/links. |
| `PUBLIC_SITE_URL` | no | Canonical origin for `sitemap.xml`, `robots.txt` and certificate links. Set to `https://techtuxacademy.online` in production. |
| `COOKIE_DOMAIN` | no | Optional cookie domain. Leave **empty** when the SPA reaches the API through the same-origin Pages proxy; a `Domain` cookie is rejected on `*.pages.dev`. |
| `COOKIE_SAMESITE` | no | `lax` (default), `strict` or `none`. Use `lax` with the same-origin proxy; `none` is only for genuinely cross-site API calls and requires HTTPS. |
| `CORS_ORIGINS` | no | Comma-separated allowed origins. Leave blank when the SPA and API share an origin. With the Pages proxy, include the canonical site and preview hosts for direct API calls. |
| `SMTP_HOST/PORT/SECURE/USER/PASS` | no | SMTP credentials. When unset, emails print to the server console. |
| `MAIL_FROM` | no | Sender address. |
| `GOOGLE_CLIENT_ID` | no | Enables Google Sign-In. The endpoint returns `503` when unset. |
| `SEED_ADMIN_EMAIL/PASSWORD` | no | Admin account created by the seed. |
| `SEED_STUDENT_EMAIL/PASSWORD` | no | Student account created by the seed. |
| `ALLOW_PROD_SEED` | no | Seeding is blocked in production unless set to `true`. |
| `UPLOAD_DIR` | no | Directory for uploaded images (default `server/uploads`). On Render's free plan this is ephemeral. |
| `RESOURCE_STORAGE_DIR` | no | Directory for generated lesson PDFs (default `storage/`, gitignored). On Render's free plan this is ephemeral; missing files are re-queued on boot. |
| `AUTO_GENERATE_RESOURCES` | no | Generate PDFs automatically for new/updated lessons (default `true`). |
| `RESOURCE_GENERATION_CONCURRENCY` | no | Background PDF workers, 1–4 (default `2`). |
| `EMBEDDED_PG_PORT/USER/PASSWORD/DATABASE` | no | Only used by `npm run db:start`. |

---

## Demo credentials (local development only)

`npm run db:seed` creates these accounts for **local development**. Never seed
production (keep `ALLOW_PROD_SEED=false`) and never reuse these passwords there.
The public login page does not display credentials.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@techtuxacademy.online` | `Admin@12345` |
| Student | `student@techtuxacademy.online` | `Student@12345` |
| Instructor | `instructor@techtuxacademy.online` | `Student@12345` |

Demo certificate ID for verification testing: **`TTA-2026-DEMO0001`** (view at `/verify-certificate/TTA-2026-DEMO0001`).

---

## Scripts

Run from the repository root:

| Command | Description |
| --- | --- |
| `npm run dev` | Start API and Vite dev server together. |
| `npm run build` | Build server (`server/dist`) and client (`client/dist`). |
| `npm start` | Run the built server (serves the SPA and API). |
| `npm run typecheck` | Type-check server and client. |
| `npm run db:start` / `db:stop` | Start/stop embedded PostgreSQL (dev only). |
| `npm run db:generate` | Generate the Prisma client. |
| `npm run db:migrate` | Apply migrations in development. |
| `npm run db:deploy` | Apply migrations in production. |
| `npm run db:seed` | Seed demo content. |
| `npm run db:studio` | Open Prisma Studio. |
| `npm run resources:generate-all` | Generate/validate lesson notes + command cheat sheet PDFs for every lesson. |
| `npm run test:api` | Run the end-to-end API smoke test (server must be running and seeded). |

---

## Production build

```bash
npm ci            # installs workspaces; server postinstall runs prisma generate
npm run build     # prisma generate + server tsc + client vite build
NODE_ENV=production npm start
```

`npm ci` runs the server `postinstall` (`prisma generate`), and the server build
also runs `prisma generate` explicitly, so the client is generated even when
lifecycle scripts are skipped. `prisma` and `@prisma/client` are pinned to the
same exact version and the Prisma CLI is a production dependency.

The built Express server serves the React SPA from `client/dist`, the REST API under `/api`, uploads under `/uploads`, and `sitemap.xml` / `robots.txt`. A SPA fallback serves `index.html` for client-side routes.

Before starting in production:

1. Set `NODE_ENV=production`.
2. Set a strong `JWT_SECRET` (the server refuses to start with the dev secret).
3. Set `PUBLIC_SITE_URL=https://techtuxacademy.online`.
4. Run `npm run db:deploy` with `DATABASE_URL`/`DIRECT_URL` pointing at the production database (use the direct, non-pooled URL for migrations).
5. Serve over HTTPS (secure cookies are enabled automatically in production).
6. Do **not** run `npm run db:seed` in production. Register the first account and promote it to `ADMIN` (see [`deploy/HOSTINGER.md`](deploy/HOSTINGER.md)).

---

## Docker deployment

A multi-stage `Dockerfile` builds both workspaces and produces a runtime image that serves the SPA and API.

```bash
cp .env.example .env
# edit .env: set JWT_SECRET, PUBLIC_SITE_URL, POSTGRES_PASSWORD, etc.

docker compose up -d --build

# Seed demo content once (optional; refuses without the flag):
docker compose run --rm -e RUN_SEED=true app
```

- App: http://localhost:4000
- PostgreSQL: `localhost:5432` (configurable via `POSTGRES_PORT`)
- Migrations run automatically on container start (`RUN_MIGRATIONS=true` by default).
- Uploads and database data are persisted in named volumes (`uploads`, `pgdata`).

Compose reads these additional variables (defaults shown): `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `PORT`, `RUN_MIGRATIONS`, `RUN_SEED`.

> **Note:** Docker was not available in the environment where this project was assembled, so the image build was not executed here. The configuration is provided as-is; verify it in your own Docker environment before production use.

---

## Deploying to techtuxacademy.online

Recommended topology: a TLS-terminating reverse proxy (Caddy or Nginx) in front of the single Node container/app, or Hostinger's managed Node.js web app. The app serves both the SPA and API from one origin, which keeps cookies first-party and avoids CORS entirely.

Set in production:

```env
NODE_ENV=production
PUBLIC_SITE_URL=https://techtuxacademy.online
CLIENT_URL=https://techtuxacademy.online
API_URL=https://techtuxacademy.online
COOKIE_SAMESITE=lax
CORS_ORIGINS=
```

### Hostinger managed Node.js hosting

Use **hPanel → Websites → Add Website → Node.js web app**, connect the GitHub
repository, and build from `main`. Hostinger injects `PORT` at runtime; do not set
it. PostgreSQL is not available on managed plans — use an external provider
(Supabase or Neon) and set both `DATABASE_URL` (pooled) and `DIRECT_URL` (direct,
for migrations).

| Setting | Value |
| --- | --- |
| Framework preset | `Express` |
| Root directory | `/` |
| Node.js version | `22` |
| Build script | `build` (`npm run build`) |
| Output directory | empty |
| Entry file | `server/dist/index.js` |

Full click-by-click instructions, environment variables, database setup,
migration commands, admin bootstrap, domain/HTTPS steps, and troubleshooting are
in [`deploy/HOSTINGER.md`](deploy/HOSTINGER.md).

### Nginx example

See [`deploy/nginx.conf.example`](deploy/nginx.conf.example). It proxies `/api` and `/uploads` to the Node app, serves the SPA, sets long-lived caching for hashed assets, and forwards the client IP.

### Caddy example

```caddyfile
techtuxacademy.online {
    encode gzip
    reverse_proxy 127.0.0.1:4000
}
```

Caddy provisions HTTPS automatically. Point the domain's DNS `A`/`AAAA` records at the server first.

### Cloudflare Pages (static SPA hosting)

Cloudflare Pages hosts the **static React + Vite frontend**. The Express API is a
separate Render service, and the browser reaches it through a **same-origin
Pages Functions proxy** at `/api` and `/uploads`. This keeps auth cookies
first-party, avoids third-party-cookie blocking, and means the SPA never needs a
build-time API host. This is a **Git-integration deployment** — Cloudflare builds
on every push to `main`; you do **not** run `wrangler deploy` (that command is
for Workers, not Pages).

1. Create a Cloudflare Pages project and connect the `TechTuxAcademy` GitHub
   repository.
2. In the dashboard, under **Build & deploy**:
   - **Framework preset:** `Vite` (or `None`)
   - **Build command:** `npm ci && npm run build -w client`
   - **Build output directory:** `client/dist`

3. `wrangler.toml` at the repository root defines the Pages build:

   ```toml
   name = "techtuxacademy"
   compatibility_date = "2026-11-01"

   [build]
   command = "npm ci && npm run build -w client"

   pages_build_output_dir = "client/dist"
   ```

   `main` is a Workers-only key and must **not** be set for a Pages project.
   Pages Functions are auto-discovered from the repository-root `functions/`
   directory.

4. The repository contains the same-origin proxy:

   ```
   functions/
   ├── _lib/proxy.js              # shared forwarding logic
   ├── api/[[path]].js            # /api/*      → https://techtux-api.onrender.com
   └── uploads/[[path]].js        # /uploads/*  → https://techtux-api.onrender.com
   ```

   The proxy forwards cookies in both directions and strips Cloudflare-specific
   request headers. It sets `Origin` to `https://techtuxacademy.online` so the
   API's CORS allowlist accepts the server-side request, and forwards the real
   client IP (`cf-connecting-ip`) for rate limiting.

5. Keep the SPA fallback in `client/public/_redirects` (copied to
   `client/dist/_redirects`):

   ```
   /* /index.html 200
   ```

   Scope Functions with `client/public/_routes.json` so only API paths invoke
   them and static assets stay on the free unlimited tier:

   ```json
   {
     "version": 1,
     "include": ["/api/*", "/uploads/*"],
     "exclude": []
   }
   ```

6. **No `VITE_API_URL` is required, and a cross-origin one is ignored.** The
   client defaults to the relative base `/api`, which works on
   `techtuxacademy.online`, `www`, and the `*.pages.dev` preview. Because the
   session cookie is host-only and `SameSite=Lax`, a cross-origin API would lose
   its cookies and break login; a stale or unresolvable host would take the whole
   site offline. `client/src/lib/api.ts` therefore honours `VITE_API_URL` only
   when it is relative or same-origin, or when `VITE_ALLOW_REMOTE_API=true`
   explicitly opts into a split deployment. Remove any `VITE_API_URL` set in
   **Settings → Environment variables** if you do not need it. See
   `client/.env.example` for the template.

7. **SEO files are static.** `client/public/robots.txt` is committed, and
   `client/scripts/generate-sitemap.mjs` snapshots the API's `/sitemap.xml`
   into `client/dist/sitemap.xml` at build time (falling back to the core public
   routes if Render is unreachable). Do not add Pages Functions for these paths —
   doing so previously prevented Pages from publishing new deployments.

> **Custom domain:** `techtuxacademy.online` must be served by Cloudflare Pages
> (or proxy to it). If the domain currently 301-redirects to
> `techtuxacademy.pages.dev`, fix the redirect at the DNS/hosting provider
> (Hostinger in this deployment) or attach the domain in the Cloudflare Pages
> dashboard. The proxy itself works on the `*.pages.dev` host without any DNS
> change.

### Render (Express backend) + Supabase PostgreSQL

Render hosts the **Express + Prisma backend** (`server/`). The database is
**Supabase PostgreSQL** (not a Render-managed database), and the React frontend
stays on Cloudflare Pages, reaching the API through the same-origin Pages
Functions proxy.

**1. Create the Supabase database**

1. Create a project at <https://supabase.com> (choose the region closest to
   Render — this deployment uses `us-west-2` with Render `oregon`).
2. Open **Project Settings → Database → Connection string**.
3. Copy the **Transaction pooler** URI (port `6543`) and append
   `?pgbouncer=true&connection_limit=1&sslmode=require` if missing → this is
   `DATABASE_URL`.
4. Copy the **Session pooler** URI (port `5432`) → this is `DIRECT_URL`. Prisma
   Migrate uses it to bypass the transaction pooler. Prefer the pooler host for
   both values: Supabase's direct `db.<ref>.supabase.co` host is often IPv6-only,
   which Render cannot reach.

The server refuses to start in production if `DATABASE_URL` still contains the
placeholder text `{project-ref}` or `***`.

**2. Deploy the Blueprint**

1. Sign up at <https://render.com> and link the GitHub repository
   `sriramkanuri-dev/TechTuxAcademy`.
2. **New + → Blueprint**, select the repo, and confirm Render detects
   `render.yaml`.
3. Render asks for the two values marked `sync: false`:
   - `DATABASE_URL` — the Supabase pooled URI
   - `DIRECT_URL` — the Supabase session-pooler URI

   They are stored as Render secrets and never committed.
4. Review the generated settings:
   - **Build command:** `npm ci && npm run build -w server`
   - **Start command:** `npm run db:deploy && npm start`
     (runs `prisma migrate deploy`, then `node server/dist/index.js`)
   - **Health check:** `/api/health`
   - **Plan:** `free` — no persistent disk
   - `AUTO_GENERATE_RESOURCES=true`, `RESOURCE_GENERATION_CONCURRENCY=2`
   - `JWT_SECRET` generated by Render
   - `COOKIE_DOMAIN=` (empty) and `COOKIE_SAMESITE=lax`
   - `CORS_ORIGINS=https://techtuxacademy.online,https://www.techtuxacademy.online,https://techtuxacademy.pages.dev`
5. **Create Web Service.** Render runs migrations on every deploy, so the
   Supabase schema is created automatically.

> **Free plan:** there is no disk. Uploaded images and generated PDFs live on the
> ephemeral filesystem. `server/src/index.ts` queues a background generation pass
> on every boot; files that are already present and up to date are skipped by the
> content-hash check, so missing PDFs are recreated automatically after a
> redeploy or cold start. Use object storage (S3/R2/Supabase Storage) for durable
> user uploads.

**3. Post-deploy**

```bash
# Verify the API directly
curl https://<service>.onrender.com/api/health

# Verify through the Pages proxy (after Cloudflare rebuilds)
curl https://techtuxacademy.pages.dev/api/health
```

The API custom domain `api.techtuxacademy.online` is **optional** with the proxy.
If you want it, add it in **Settings → Custom Domains** and create a `CNAME`
record `api` → `techtux-api.onrender.com` at your DNS provider. Do not set
`VITE_API_URL`; the client uses the relative `/api` base.

Admins can generate/regenerate PDFs from **Admin → Learning resources**. The
startup pass and the admin queue both run in the background so the API stays
responsive.

A longer walkthrough lives in [`deploy/RENDER.md`](deploy/RENDER.md).

### Post-deploy checklist

- [ ] `NODE_ENV=production` and a strong `JWT_SECRET`
- [ ] HTTPS active; cookies marked `secure` automatically
- [ ] `npm run db:deploy` applied with the session-pooler URL
- [ ] `GET /api/health` returns `{"status":"ok"}` directly and through the Pages proxy
- [ ] `COOKIE_DOMAIN` empty and `COOKIE_SAMESITE=lax` when using the same-origin proxy
- [ ] `CORS_ORIGINS` includes the canonical site and preview hosts
- [ ] First admin promoted; `ALLOW_PROD_SEED` left `false` (never seed demo data in production)
- [ ] SMTP configured (otherwise verification/reset links only appear in logs)
- [ ] `PUBLIC_SITE_URL` correct so sitemap and certificate links use the real domain
- [ ] Startup generation completed: every lesson resource is `READY` with `0` failed
- [ ] Student PDF downloads work; anonymous requests return `401`/`403`
- [ ] Uploaded images moved to durable object storage if they must survive deploys
- [ ] Supabase backups configured

---

## API overview

All endpoints are under `/api`. Mutations require the `x-csrf-token` header matching the `tta_csrf` cookie; the session is the `httpOnly` `tta_session` cookie.

| Area | Endpoints (selected) |
| --- | --- |
| Health | `GET /api/health` |
| Auth | `POST /api/auth/register`, `/login`, `/logout`, `/forgot-password`, `/reset-password`, `/verify-email`, `/change-password`, `GET /api/auth/me`, Google sign-in |
| Catalogue | `GET /api/courses`, `/courses/:slug`, `/categories`, `/tutorials`, `/posts`, `/search`, `/search/suggest` |
| Site | `GET /api/site/home`, `/site/settings`, `/testimonials`, `/announcements` |
| Learning | `POST /api/me/enroll/:courseId`, `GET /api/me/enrollments`, `/me/courses/:slug`, `/me/dashboard`, `POST /api/me/lessons/:id/watch`, `/complete`, `GET /api/me/certificates` |
| Certificates | `GET /api/certificates/verify/:id`, `GET /api/certificates/:id/pdf` |
| Lesson resources | `GET /api/resources/lesson/:lessonId`, `GET /api/resources/:id/file` (enrolled students and admins only) |
| Admin resources | `GET /api/admin/resources/overview`, `/missing`, `/jobs`, `/jobs/:id`, `/courses/:id`; `POST .../generate`, `.../generate-all`, `.../outdated`, `.../cleanup`; `DELETE /api/admin/resources/:id` |
| Admin | `GET /api/admin/stats`, `/users`, `/enrollments`, `/certificates`, `/settings`, `/newsletter`, `/messages`; content CRUD under `/courses/admin`, `/tutorials/admin`, `/posts/admin`, `/categories/admin` |
| SEO | `GET /sitemap.xml`, `/robots.txt` |

---

## Testing

**API smoke test** (requires a running, seeded API):

```bash
npm run dev            # in one terminal
npm run test:api       # in another
```

The script performs 27 checks covering public endpoints, CSRF rejection, student auth and learning, certificate verification/PDF, admin access control, settings round-trip and logout.

**Type-checking and build:**

```bash
npm run typecheck
npm run build
```

**UI verification:** public routes and authenticated student/admin pages were verified with headless Chromium during development (21 checks), including the learning player, student certificates page, admin course editor, and Telugu language mode.

---

## Security notes

- Passwords are hashed with bcrypt; password hashes are never returned by the API.
- Sessions use signed JWTs in `httpOnly`, `secure` (in production), `sameSite` cookies.
- CSRF protection uses a double-submit token (`tta_csrf` cookie + `x-csrf-token` header).
- Role-based access control is enforced server-side (`requireAuth`, `requireAdmin`, `AdminRoute`); disabling an account blocks it on every request.
- Inputs are validated with Zod; Prisma parameterises all queries (no string-built SQL).
- Rate limiting is applied to API, auth and form endpoints.
- Helmet sets security headers; CSP and strict CORS are enabled in production.
- Certificate PDFs and verification are blocked for revoked certificates (`410`).
- Secrets come from environment variables; `.env` files are git-ignored.
- The seed refuses to run in production unless `ALLOW_PROD_SEED=true`.

---

## Content management

Everything is managed from `/admin` (admin role required):

- **Courses** — create/edit courses and lessons, set YouTube URLs, preview flags, resources, thresholds and publish state.
- **Tutorials / Blog** — markdown bodies, English and Telugu fields, tags, categories, cover images and publish state.
- **Categories** — name (English/Telugu), slug, description, icon and colour.
- **Website** — homepage/about copy, contact/social links, announcements, testimonials, newsletter subscribers and the contact inbox.
- **Users / Enrolments / Certificates** — roles, enable/disable, reporting, revoke/reinstate.
- **Analytics** — live rates and top courses derived from database counts.

Lesson video URLs are YouTube IDs/URLs only; videos are embedded, never downloaded.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Missing required environment variable: DATABASE_URL` | Create `server/.env` from `.env.example` and set `DATABASE_URL`. |
| `JWT_SECRET must be configured in production` | Set a real `JWT_SECRET`; the dev fallback is rejected in production. |
| `Can't reach database server` | Start PostgreSQL and confirm the host/port in `DATABASE_URL`. For the embedded DB use port `5433`. |
| Emails not arriving | Configure SMTP; without it, links are printed to the API console. |
| Login works but mutations return `403 CSRF` | Ensure the client sends `x-csrf-token`; it is issued on the first API request. |
| Google button returns `503` | Set `GOOGLE_CLIENT_ID`. |
| Certificate download returns `410` | The certificate was revoked by an admin. |
| SPA routes 404 behind a proxy | Configure the proxy to fall back to `index.html` for non-API paths. |
| `/api/health` returns the SPA HTML | The Pages Functions proxy is missing or `_routes.json` excludes `/api/*`. Ensure `functions/api/[[path]].js` is committed and the Pages build ran. |
| Login succeeds but the session is not kept | With the same-origin proxy, set `COOKIE_DOMAIN` empty and `COOKIE_SAMESITE=lax`. A `Domain=.techtuxacademy.online` cookie is rejected on `*.pages.dev`. |
| "Cannot reach the server" / `ERR_NAME_NOT_RESOLVED` | The build baked in a dead `VITE_API_URL`. The SPA now ignores cross-origin values unless `VITE_ALLOW_REMOTE_API=true`; remove the stale variable in Pages → Settings → Environment variables and redeploy. |
| API works directly but not from the site | Check the Pages Function proxy origin (`functions/_lib/proxy.js`) and that `CORS_ORIGINS` includes the site/preview hosts. |
| Site 301-redirects to `*.pages.dev` | Fix the DNS/hosting redirect (Hostinger) or attach the custom domain to the Cloudflare Pages project. |

---

## License

Private project. All content and branding © TechTuxAcademy.
