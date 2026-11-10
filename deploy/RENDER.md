# Deploying TechTuxAcademy to Render (Express API + Supabase PostgreSQL)

This guide deploys the **Express + Prisma backend** (`server/`) to Render and
uses **Supabase PostgreSQL** as the production database. The React frontend stays
on Cloudflare Pages (see the "Cloudflare Pages" section in the root
[`README.md`](../README.md)).

Topology:

```
Browser
  ├─ https://techtuxacademy.online      → Cloudflare Pages (client/dist)
  └─ https://api.techtuxacademy.online  → Render Web Service (server/dist)
                                              └─ Supabase PostgreSQL (pooled 6543 / direct 5432)
```

---

## 1. Create the Supabase database

1. Sign in at <https://supabase.com> and create a project (choose the region
   closest to your Render region).
2. Open **Project Settings → Database → Connection string**.
3. Copy the **Transaction pooler** URI (port `6543`). Append
   `?pgbouncer=true&connection_limit=1` if it is not already present.
   This becomes `DATABASE_URL`.
4. Copy the **Direct connection** URI (port `5432`). This becomes `DIRECT_URL`.
   Prisma Migrate uses it to bypass the pooler.
5. Replace `<password>` in both URIs with the database password. If the password
   contains special characters, URL-encode it.

Example (newer Supabase projects use the pooler host; older ones use
`db.<project-ref>.supabase.co`):

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
DIRECT_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

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
   - `DIRECT_URL` — the Supabase direct URI
4. Confirm the service settings:
   - **Build command:** `npm ci && npm run build -w server`
   - **Start command:** `npm run db:deploy && npm start`
   - **Health check path:** `/api/health`
   - **Plan:** Starter (required for persistent disks)
   - **Disk:** `techtux-data` mounted at `/var/data`
5. **Create Web Service.** On the first deploy Render runs
   `prisma migrate deploy` (creating the schema in Supabase) and then starts the
   API.

Render generates `JWT_SECRET` automatically. The Blueprint also sets
`NODE_ENV=production`, `COOKIE_SAMESITE=none`, `COOKIE_DOMAIN=.techtuxacademy.online`,
`UPLOAD_DIR=/var/data/uploads`, `RESOURCE_STORAGE_DIR=/var/data/resources`, and
`AUTO_GENERATE_RESOURCES=true`.

### Free plan

Render's free plan does not support disks. Remove the `disk:` block from
`render.yaml`; uploads and generated PDFs will be lost on every redeploy and must
be regenerated. Prefer the Starter plan for production.

---

## 3. Verify the deploy

```bash
curl https://<service-name>.onrender.com/api/health
# {"status":"ok","service":"TechTuxAcademy API",...}
```

Then:

1. Point the custom domain **Settings → Custom Domains** at
   `api.techtuxacademy.online` and add the DNS record Render shows.
2. Set the frontend build variable in Cloudflare Pages
   (**Settings → Environment variables**):
   `VITE_API_URL=https://api.techtuxacademy.online`. The client normalizes a
   missing `/api` suffix automatically.

---

## 4. Create the first admin

Do **not** run `npm run db:seed` in production. Instead:

1. Register an account through the site (`/register`).
2. In **Supabase → SQL Editor**, promote it:

   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
   ```

   (Table names are Prisma's PascalCase defaults.)

3. Sign in at `/admin`.

---

## 5. Generate lesson resources

Every lesson should have two PDFs: lesson notes and a command cheat sheet. They
are generated from lesson content and stored under `RESOURCE_STORAGE_DIR`.

From the Render dashboard open **Shell** for the service and run:

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

Admins can also generate from **Admin → Learning resources** in the UI. The queue
runs in the background so the API stays responsive.

---

## 6. Post-deploy checklist

- [ ] `GET /api/health` returns `{"status":"ok"}`
- [ ] `prisma migrate deploy` succeeded in the deploy logs
- [ ] `DATABASE_URL` is the pooled URI; `DIRECT_URL` is the direct URI
- [ ] `JWT_SECRET` is Render-generated (not the dev default)
- [ ] Custom domain `api.techtuxacademy.online` is verified and HTTPS is active
- [ ] `VITE_API_URL` set in Cloudflare Pages and the site redeployed
- [ ] Login, enrolment, lesson completion and certificate PDF work end-to-end
- [ ] First admin promoted; `ALLOW_PROD_SEED=false`
- [ ] `npm run resources:generate-all` reports `0 invalid`
- [ ] Student PDF downloads work; anonymous requests return `401`
- [ ] Disk mounted at `/var/data`; backups configured for Supabase

---

## 7. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Deploy fails: `Missing required environment variable: DATABASE_URL` | The two `sync: false` values were not entered. Add them under **Environment**. |
| Startup: `DATABASE_URL still contains placeholder text` | Paste the real Supabase URI (not `{project-ref}` / `***`). |
| `Can't reach database server` | Use the **pooler** host/port for `DATABASE_URL`. Direct host may be IPv6-only. |
| `prepared statement "s0" already exists` | Add `?pgbouncer=true` to the pooled `DATABASE_URL`. |
| Migrations fail | `DIRECT_URL` must be the port `5432` direct URI. |
| PDFs 404 after redeploy | Disk not mounted or `RESOURCE_STORAGE_DIR` not `/var/data/resources`. Regenerate resources. |
| Cookies not sent cross-site | `COOKIE_SAMESITE=none` requires HTTPS and `COOKIE_DOMAIN=.techtuxacademy.online`. |
| CORS error from the site | Set `CORS_ORIGINS=https://techtuxacademy.online`. |
