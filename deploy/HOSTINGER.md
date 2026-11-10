# Deploying TechTuxAcademy to Hostinger (managed Node.js)

> Deploying the backend to **Render with Supabase** instead? See
> [`RENDER.md`](RENDER.md).

This guide targets **Hostinger Node.js Web App** hosting for `https://techtuxacademy.online`.
It does **not** use Docker Compose. Hostinger runs one Node.js process and injects
`process.env.PORT` at runtime; the app already reads that variable.

The Express server serves both the API (`/api`) and the built React SPA
(`client/dist`), so the frontend and API share one origin. That keeps session
cookies first-party and means `CORS_ORIGINS` can stay empty.

---

## 1. Production database (external PostgreSQL)

Hostinger shared/managed plans do **not** provide PostgreSQL. Use an external
PostgreSQL provider. Hostinger documents a Supabase connection wizard; Neon also
works. This project needs **two** connection strings:

| Variable | Used by | Value |
| --- | --- | --- |
| `DATABASE_URL` | The running app (Prisma Client) | Pooled connection string (Supabase transaction pooler, port `6543`, IPv4) with `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Prisma Migrate only | Direct connection string (port `5432`) |

`DIRECT_URL` is declared as `directUrl` in `server/prisma/schema.prisma`. It is
never used by the running application; it lets migrations bypass the pooler.

### Supabase steps

1. Create a project at <https://supabase.com>.
2. Open **Project Settings → Database → Connection string**.
3. Copy the **Transaction pooler** URI (port `6543`) and append
   `?pgbouncer=true&connection_limit=1` if it is not already present. Use this as
   `DATABASE_URL`.
4. Copy the **Direct connection** URI (port `5432`). Use this as `DIRECT_URL`
   when running migrations from your machine.
5. Store both values only in Hostinger's environment variables and in a local
   password manager. Never commit them.

> Supabase's direct host can be IPv6-only on the free plan. If your machine has
> no IPv6 route, use the **Session pooler** URI for migrations or run migrations
> from a network with IPv6. The running app should always use the transaction
> pooler on IPv4.

---

## 2. Push the repository to GitHub

The app deploys from a GitHub repository. Complete the GitHub push first (see the
main project report / `README.md`). Hostinger will build from the `main` branch.

---

## 3. Create the Hostinger Node.js web app

1. Sign in to **hPanel** → **Websites** → **Add Website**.
2. Choose **Node.js web app**.
3. Under **Import your Git repository**, click **Connect with GitHub**.
4. Install the **Hostinger GitHub App** and grant it access to the
   `TechTuxAcademy` repository.
5. Select the repository and click **Deploy**.
6. On the deploy settings screen, review the values below and override the
   auto-detected ones where they differ.

### Build settings

| Setting | Value |
| --- | --- |
| Framework preset | **Express** (`express`) |
| Root directory | `/` (repository root — required because this is an npm-workspaces monorepo) |
| Node.js version | **22** |
| Build script | `build` (hPanel may display it as `npm run build`) |
| Output directory | **leave empty** (Express deploys the whole root; the field is hidden) |
| Entry file | `server/dist/index.js` |
| Package manager | `npm` (detected from `package-lock.json`) |

Why the root directory is `/`: the root `package.json` owns the `server` and
`client` workspaces. The root build script compiles the API into `server/dist`
and the SPA into `client/dist`. The Express server resolves the SPA at
`../../client/dist` relative to `server/dist/config.js`. Deploying only `server/`
would skip the frontend build and break static serving.

Hostinger runs the entry file with Node; there is no separate start-command field
for the Express preset. Locally the equivalent commands are:

```bash
npm run build      # prisma generate + tsc (server) + vite build (client)
npm start          # node dist/index.js inside the server workspace
```

---

## 4. Environment variables

Add these in hPanel under **Environment variables** (available during onboarding
and afterwards in the website dashboard sidebar). Hostinger injects them into
both the build and the running app.

| Variable | Required | Value |
| --- | --- | --- |
| `NODE_ENV` | **yes** | `production` |
| `DATABASE_URL` | **yes** | Supabase transaction-pooler URI (`6543`, `?pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | for migrations | Supabase direct URI (`5432`) — safe to store here; not used at runtime |
| `JWT_SECRET` | **yes** | 48+ random bytes, e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | no | `7d` |
| `CLIENT_URL` | **yes** | `https://techtuxacademy.online` |
| `API_URL` | **yes** | `https://techtuxacademy.online` |
| `PUBLIC_SITE_URL` | **yes** | `https://techtuxacademy.online` |
| `COOKIE_DOMAIN` | no | leave empty (or `.techtuxacademy.online` if using subdomains) |
| `COOKIE_SAMESITE` | no | `lax` |
| `CORS_ORIGINS` | no | leave empty (same origin) |
| `SMTP_HOST` | no | SMTP host; without it, verification/reset links are printed to the server log |
| `SMTP_PORT` | no | `587` |
| `SMTP_SECURE` | no | `false` (use `true` for port 465) |
| `SMTP_USER` | no | SMTP username |
| `SMTP_PASS` | no | SMTP password |
| `MAIL_FROM` | no | `TechTuxAcademy <no-reply@techtuxacademy.online>` |
| `GOOGLE_CLIENT_ID` | no | Google Identity Services client ID; omit to hide Google Sign-In |
| `ALLOW_PROD_SEED` | **no** | leave `false`; never enable on production |
| `PORT` | **no** | do **not** set it; Hostinger assigns it at runtime |

Do not add `SEED_*` variables in production. They are only for local demo data.

---

## 5. First deploy

1. Save the environment variables, then click **Deploy**.
2. Watch **Deployments → build log**. A healthy build runs:
   - `npm ci` (installs workspaces; the server `postinstall` runs `prisma generate`)
   - `npm run build` → `prisma generate`, `tsc`, `vite build`
3. Hostinger starts `server/dist/index.js` and injects `PORT`.
4. Open `https://techtuxacademy.online/api/health` — expect
   `{"status":"ok","service":"TechTuxAcademy API",...}`.

The build script deliberately runs `prisma generate` so a production install that
omits dev-only lifecycle scripts still gets a generated client. The Prisma CLI is
a production dependency (`prisma` and `@prisma/client` are pinned to `6.19.3`).
The repository also contains an `.npmrc` with `include=dev`, because Hostinger
injects `NODE_ENV=production` into the build and npm would otherwise omit the
TypeScript/Vite/Tailwind toolchain before `npm run build`.

---

## 6. Apply migrations (safe, separate from the build)

The build does **not** touch the database. Run migrations once from your local
machine against the production database:

```bash
cd /path/to/TechTuxAcademy

# Use the direct connection for migrations (never commit these values).
export DATABASE_URL="<supabase-direct-5432-uri>"
export DIRECT_URL="<supabase-direct-5432-uri>"

npm run db:deploy
```

`prisma migrate deploy` applies the committed migrations in
`server/prisma/migrations` and is idempotent. Do **not** run `npm run db:seed`
against production — it creates demo users and content and is blocked unless
`ALLOW_PROD_SEED=true`.

### Create the first admin (fresh production database)

1. Register a normal account at `https://techtuxacademy.online/register`.
2. Promote it once, using Prisma Studio locally against the production database:

   ```bash
   cd server
   export DATABASE_URL="<supabase-direct-5432-uri>"
   export DIRECT_URL="<supabase-direct-5432-uri>"
   npx prisma studio
   ```

   Open the `User` table, find your email, and set `role` to `ADMIN`.
3. Alternatively, run this SQL in the Supabase SQL editor:

   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
   ```

4. Sign out and back in. The `/admin` dashboard will be available.

### Migrating existing development data (optional)

If you want to keep the content/users from the local database:

```bash
# 1. Migrate the empty production schema first.
DATABASE_URL="<direct>" DIRECT_URL="<direct>" npm run db:deploy

# 2. Dump the local database (custom format).
pg_dump -Fc -h localhost -p 5433 -U postgres techtuxacademy > techtuxacademy.dump

# 3. Restore into production (this includes the _prisma_migrations table).
pg_restore --no-owner --no-privileges --clean --if-exists \
  -d "<production-direct-uri>" techtuxacademy.dump

# 4. Confirm there are no pending migrations.
DATABASE_URL="<direct>" DIRECT_URL="<direct>" npm run db:deploy
```

Keep the dump file out of Git (`*.dump` is ignored). Never restore a development
dump on top of a database that already contains real production data.

---

## 7. Domain and HTTPS

1. In hPanel, open the website → **Domains** and add `techtuxacademy.online`
   (and `www.techtuxacademy.online` if desired).
2. Point the domain's DNS at Hostinger (nameservers or the `A` record shown in
   hPanel). Remove conflicting old records.
3. Enable **SSL** for the domain in hPanel and wait for the certificate to issue.
4. Force HTTPS and redirect `www` to the apex domain (or the reverse) in
   **Domains → Redirects**.
5. Re-check `https://techtuxacademy.online/api/health` after DNS/SSL propagate.

Secure cookies are enabled automatically when `NODE_ENV=production`, so HTTPS
must be active before testing login.

---

## 8. Post-deploy verification

Run these from your machine:

```bash
curl -sS https://techtuxacademy.online/api/health
curl -sSI https://techtuxacademy.online/ | grep -iE 'strict-transport|content-security'
curl -sS https://techtuxacademy.online/api/courses | head -c 200
curl -sS https://techtuxacademy.online/sitemap.xml | head -c 200
curl -sS https://techtuxacademy.online/robots.txt
```

Then verify in a browser:

- [ ] Homepage loads with live stats and no console errors.
- [ ] `/courses`, `/tutorials`, `/blog` load and open detail pages.
- [ ] Registration and login succeed; session persists across refresh.
- [ ] Student dashboard, learning player, and certificate download work.
- [ ] Admin dashboard loads for an `ADMIN` account.
- [ ] Telugu language toggle renders Telugu content.
- [ ] Newsletter form and contact form submit.
- [ ] Certificate verification page resolves a real certificate ID.
- [ ] Browser console and Hostinger runtime logs show no errors.
- [ ] `http://` redirects to `https://`; certificate is valid.

---

## 9. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Build fails with `prisma: not found` | `prisma` must stay in `dependencies` (already configured). Redeploy. |
| Build fails with a Prisma version error | Keep `prisma` and `@prisma/client` pinned to the same exact version (`6.19.3`). |
| App builds but crashes with a missing Prisma engine | `binaryTargets` already includes `native`, `debian-openssl-3.0.x`, and `rhel-openssl-3.0.x`. Check the runtime log for the exact target and add it if needed. |
| `Can't reach database server` | Use the Supabase **transaction pooler** URI for `DATABASE_URL` (IPv4, port `6543`). Verify the password and `?pgbouncer=true`. |
| Migrations fail through the pooler | Run migrations with the **direct** URI (`DIRECT_URL` / port `5432`), not the pooler. |
| 502 / app not starting | Check the runtime log. `NODE_ENV=production` requires a non-default `JWT_SECRET`. |
| SPA routes 404 but `/` works | Confirm the entry file is `server/dist/index.js` and the root directory is `/`; the server must find `client/dist`. |
| Login succeeds but mutations return `403 CSRF` | Cookies must be first-party. Keep `CLIENT_URL` on the same origin and leave `CORS_ORIGINS` empty. |
| Google button returns `503` | `GOOGLE_CLIENT_ID` is not set. |
| Emails are not delivered | Configure SMTP. Without it, verification/reset links only appear in the runtime log. |
| Uploaded images disappear after a redeploy | Uploads are written to `server/uploads` on the app's local disk. Back them up, or move uploads to external object storage before relying on them in production. |

---

## 10. Notes and limits

- **No Docker on managed hosting.** `Dockerfile`, `docker-compose.yml`, and
  `deploy/nginx.conf.example` remain for local/VPS use only.
- **Build limits:** dependency installation and the build script each have a
  15-minute limit. This project builds in well under a minute.
- **Automatic deploys:** every push to `main` triggers a rebuild.
- **Secrets:** set them in hPanel, never in the repository. `.env` files are
  git-ignored.
- **Demo data:** never enable `ALLOW_PROD_SEED` on the public site.
