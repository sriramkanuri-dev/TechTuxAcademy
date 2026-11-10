# Deploying TechTuxAcademy to Render (Express API + Supabase PostgreSQL)

This guide deploys the **Express + Prisma backend** (`server/`) to Render and
uses **Supabase PostgreSQL** as the production database. The React frontend stays
on Cloudflare Pages and reaches the API through a **same-origin Pages Functions
proxy** (see the "Cloudflare Pages" section in the root
[`README.md`](../README.md)).

Topology:

```
Browser
  └─ https://techtuxacademy.online (or *.pages.dev)
       │
       ├─ /            → Cloudflare Pages (client/dist)
       └─ /api/*       → Pages Function proxy ──┐
          /uploads/*                            │
                                                ▼
                              Render Web Service (server/dist)
                                     └─ Supabase PostgreSQL
                                        pooled 6543 / session 5432
```

The browser only talks to the Pages host, so auth cookies are first-party and
`/api` works on any hostname without rebuilding the frontend.

---

## 1. Create the Supabase database

1. Sign in at <https://supabase.com> and create a project (choose the region
   closest to your Render region — this deployment uses `us-west-2` with Render
   `oregon`).
2. Open **Project Settings → Database → Connection string**.
3. Copy the **Transaction pooler** URI (port `6543`). Append
   `?pgbouncer=true&connection_limit=1&sslmode=require` if it is not already
   present. This becomes `DATABASE_URL`.
4. Copy the **Session pooler** URI (port `5432`). This becomes `DIRECT_URL`.
   Prisma Migrate uses it to bypass the transaction pooler.
5. Replace `<password>` in both URIs with the database password. If the password
   contains special characters, URL-encode it.

Example (newer Supabase projects use the pooler host; older ones use
`db.<project-ref>.supabase.co`):

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
DIRECT_URL=postgresql://postgres.<project-ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

> Prefer the pooler host for **both** URLs. Supabase's direct
> `db.<ref>.supabase.co` host is often IPv6-only, which Render cannot reach.
>
> Never commit these values. They are entered in the Render dashboard and stored
> as secrets.

---

## 2. Deploy the Blueprint

1. Sign in at <https://render.com> and connect the GitHub account that owns
   `sriramkanuri-dev/TechTuxAcademy`.
2. **New + → Blueprint**, select the repository, and confirm Render detects
   [`render.yaml`](../render.yaml).
3. Render prompts for the values marked `sync: false`:
   - `DATABASE_URL` — the Supabase pooled URI
   - `DIRECT_URL` — the Supabase session-pooler URI
4. Confirm the service settings:
   - **Build command:** `npm ci && npm run build -w server`
   - **Start command:** `npm run db:deploy && npm start`
   - **Health check path:** `/api/health`
   - **Plan:** Free (no persistent disk)
5. **Create Web Service.** On the first deploy Render runs
   `prisma migrate deploy` (creating the schema in Supabase) and then starts the
   API.

Render generates `JWT_SECRET` automatically. The Blueprint also sets
`NODE_ENV=production`, `COOKIE_DOMAIN=` (empty), `COOKIE_SAMESITE=lax`,
`CORS_ORIGINS=https://techtuxacademy.online,https://www.techtuxacademy.online,https://techtuxacademy.pages.dev`,
and `AUTO_GENERATE_RESOURCES=true`.

### Free plan and storage

Render's free plan has no persistent disk, so uploaded images and generated PDFs
live on an ephemeral filesystem. `server/src/index.ts` queues a background
generation pass on every boot; files that already exist and match the content
hash are skipped, so missing PDFs are recreated automatically after a redeploy or
cold start. For durable user uploads, use object storage (S3, Cloudflare R2 or
Supabase Storage). Prefer the Starter plan plus a disk if you need local
persistence.

### Cookies

Because the frontend uses the same-origin Pages proxy, configure:

```env
COOKIE_DOMAIN=
COOKIE_SAMESITE=lax
```

A `Domain=.techtuxacademy.online` cookie is rejected on `*.pages.dev`, and
`SameSite=None` invites third-party-cookie blocking. Only use `SameSite=None`
with a `Domain` cookie if you deliberately call the API cross-site without the
proxy.

---

## 3. Verify the deploy

```bash
# Direct API
curl https://<service-name>.onrender.com/api/health
# {"status":"ok","service":"TechTuxAcademy API",...}

# Through the Cloudflare Pages proxy (after Pages rebuilds)
curl https://techtuxacademy.pages.dev/api/health
```

The second check must return JSON, not the SPA HTML. If it returns HTML, the
Pages Function proxy did not deploy — confirm `functions/api/[[path]].js` is
committed and the Pages build succeeded.

### Custom API domain (optional)

The proxy removes the need for a public API hostname. If you still want
`api.techtuxacademy.online`:

1. Render **Settings → Custom Domains → Add Custom Domain**.
2. At your DNS provider, create `CNAME api → techtux-api.onrender.com`.
3. Wait for Render to verify the domain and issue TLS.

Do **not** set `VITE_API_URL`; the client uses the relative `/api` base.

---

## 4. Create the first admin and configure email

Do **not** run `npm run db:seed` in production. Instead, bootstrap the primary
administrator from a machine that can reach the production database, using the
pooled `DATABASE_URL` from Render:

```bash
ADMIN_EMAIL=sriramkanuri4@gmail.com ADMIN_NAME="Sriram Kanuri" \
  npm run admin:set -w server
```

The script either promotes the existing account (no duplicate) or creates it with
the `ADMIN` role. When `ADMIN_PASSWORD` is omitted a random password is generated
and **not printed**; set your own through **Forgot password?** on the login page.
Sign in at `/admin` afterwards.

Alternatively, register through `/register` and promote in **Supabase → SQL
Editor**:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

### Gmail SMTP

Add these under **Environment** (never commit them):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=sriramkanuri4@gmail.com
SMTP_PASS=<Google App Password>
MAIL_FROM=sriramkanuri4@gmail.com
PUBLIC_SITE_URL=https://techtuxacademy.online
```

`EMAIL_FROM` is accepted as an alias for `MAIL_FROM`. A Google App Password
requires 2-Step Verification on the account; a normal Gmail password is rejected
with `535-5.7.8`. Verify the transport without exposing the secret:

```bash
npm run mail:verify -w server
```

Password reset links use `PUBLIC_SITE_URL`. If the canonical domain still
redirects to the root of `*.pages.dev` (dropping the path), point
`PUBLIC_SITE_URL` at the working host until the redirect is fixed, otherwise the
emailed link will not reach `/reset-password`.

If you seed a private staging environment, set strong `SEED_ADMIN_PASSWORD` /
`SEED_STUDENT_PASSWORD` values and keep `ALLOW_PROD_SEED=false` everywhere else.

---

## 5. Generate lesson resources

Every lesson can have up to two PDFs: lesson notes and a command cheat sheet
(lessons without shell commands have notes only). They are generated from lesson
content and stored under `RESOURCE_STORAGE_DIR`.

On the free plan you cannot open a Render Shell. Use either:

- the automatic startup pass (`AUTO_GENERATE_RESOURCES=true`), or
- **Admin → Learning resources → Generate all** in the UI.

For local or Starter-plan runs, the CLI is also available:

```bash
npm run resources:generate-all
```

The command prints progress, then validates every READY record: the file exists,
starts with `%PDF-`, ends with `%%EOF`, and is larger than 1 KB. Exit code is
non-zero if anything failed or is invalid.

Useful variants:

```bash
# One course (id or slug)
npm run resources:generate-all -w server -- --course linux-essentials-zero-to-command-line-hero

# One lesson, forcing regeneration
npm run resources:generate-all -w server -- --lesson <lessonId> --force
```

The queue runs in the background so the API stays responsive.

---

## 6. Post-deploy checklist

- [ ] `GET /api/health` returns `{"status":"ok"}` directly and through the Pages proxy
- [ ] `prisma migrate deploy` succeeded in the deploy logs
- [ ] `DATABASE_URL` is the pooled URI; `DIRECT_URL` is the session-pooler URI
- [ ] `JWT_SECRET` is Render-generated (not the dev default)
- [ ] `COOKIE_DOMAIN` is empty and `COOKIE_SAMESITE=lax`
- [ ] `CORS_ORIGINS` includes the canonical site and preview hosts
- [ ] Login, enrolment, lesson completion and certificate PDF work end-to-end
- [ ] First admin promoted; `ALLOW_PROD_SEED=false`
- [ ] SMTP configured and `npm run mail:verify -w server` passes
- [ ] Forgot-password returns the generic message for known and unknown emails
- [ ] Reset link arrives, is single-use and expires after 30 minutes
- [ ] Every lesson resource is `READY` with `0` failed (startup pass or admin UI)
- [ ] Student PDF downloads work; anonymous requests return `401`/`403`
- [ ] Durable object storage configured if uploads must survive deploys
- [ ] Supabase backups configured

---

## 7. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Deploy fails: `Missing required environment variable: DATABASE_URL` | The two `sync: false` values were not entered. Add them under **Environment**. |
| Startup: `DATABASE_URL still contains placeholder text` | Paste the real Supabase URI (not `{project-ref}` / `***`). |
| `Can't reach database server` | Use the **pooler** host/port for both URLs. Direct host may be IPv6-only. |
| `prepared statement "s0" already exists` | Add `?pgbouncer=true` to the pooled `DATABASE_URL`. |
| Migrations fail | `DIRECT_URL` must be the port `5432` session-pooler URI. |
| PDFs 404 after redeploy | Free plan has no disk. Trigger generation from the admin UI or wait for the startup pass. |
| Login works but the session is not kept | Set `COOKIE_DOMAIN=` and `COOKIE_SAMESITE=lax`; a `Domain` cookie is rejected on `*.pages.dev`. |
| CORS error from the site | Add the site/preview origins to `CORS_ORIGINS`, or use the same-origin Pages proxy. |
| `/api/health` returns SPA HTML | The Pages Function proxy is missing or the Pages build did not run. Confirm `functions/` is committed and redeploy. |
