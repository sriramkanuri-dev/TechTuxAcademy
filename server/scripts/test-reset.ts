/**
 * Password-reset integration test. Runs against a LOCAL API + LOCAL database
 * (never production): it creates a throwaway account and rewrites only that
 * account's reset token to exercise expiry/reuse paths.
 *
 *   API_URL=http://localhost:4100 npm run test:reset -w server
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const BASE = (process.env.API_URL || 'http://localhost:4100').replace(/\/$/, '');
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  \u2713 ${name}`);
  } else {
    failed += 1;
    console.error(`  \u2717 ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

class Session {
  private cookies = new Map<string, string>();
  csrf = '';

  private store(res: Response) {
    for (const raw of res.headers.getSetCookie()) {
      const [pair] = raw.split(';');
      const index = pair.indexOf('=');
      const key = pair.slice(0, index).trim();
      const value = pair.slice(index + 1);
      if (!value) this.cookies.delete(key);
      else this.cookies.set(key, value);
      if (key === 'tta_csrf' && value) this.csrf = value;
    }
  }

  async request(method: string, path: string, body?: unknown) {
    const headers: Record<string, string> = {
      cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '),
    };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (!['GET', 'HEAD'].includes(method) && this.csrf) headers['x-csrf-token'] = this.csrf;
    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    this.store(res);
    return res;
  }

  async json<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
    const res = await this.request(method, path, body);
    const data = (await res.json().catch(() => null)) as T;
    return { status: res.status, data };
  }

  snapshot() {
    return new Map(this.cookies);
  }

  restore(snapshot: Map<string, string>) {
    this.cookies = new Map(snapshot);
    this.csrf = this.cookies.get('tta_csrf') || '';
  }
}

const email = `reset-test-${Date.now()}@example.com`;
const oldPassword = 'OldPassword123';
const newPassword = 'NewPassword456';

async function main() {
  console.log(`\nPassword reset integration test — ${BASE}\n`);
  const anon = new Session();
  const user = new Session();

  await anon.request('GET', '/api/site/home');
  await user.request('GET', '/api/site/home'); // give `user` its own CSRF cookie

  // Throwaway account.
  const register = await user.json<{ user: { id: string } }>('POST', '/api/auth/register', {
    name: 'Reset QA',
    email,
    password: oldPassword,
  });
  check('throwaway account created', register.status === 201 && Boolean(register.data?.user?.id));
  const userId = register.data?.user?.id;

  // The `authenticate` middleware keeps sessions minted within 2s of a password
  // change, so the registration-time session must be older than that before the
  // reset so the revocation check actually fires.
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // ── Generic responses ─────────────────────────────────────────────
  const known = await anon.json<{ message: string }>('POST', '/api/auth/forgot-password', { email });
  const unknown = await anon.json<{ message: string }>('POST', '/api/auth/forgot-password', {
    email: `nobody-${Date.now()}@example.com`,
  });
  check('forgot password: known email returns 200', known.status === 200);
  check('forgot password: unknown email returns 200', unknown.status === 200);
  check(
    'forgot password: identical response for known and unknown',
    known.data?.message === unknown.data?.message
  );
  check(
    'forgot password: response never contains a token',
    !JSON.stringify(known.data).toLowerCase().includes('token')
  );

  const stored = await prisma.user.findUnique({
    where: { email },
    select: { passwordResetToken: true, passwordResetExpires: true },
  });
  check(
    'reset token stored as a 64-char SHA-256 digest (not plaintext)',
    Boolean(stored?.passwordResetToken && /^[0-9a-f]{64}$/.test(stored.passwordResetToken))
  );
  const ttlMinutes = stored?.passwordResetExpires
    ? Math.round((stored.passwordResetExpires.getTime() - Date.now()) / 60000)
    : -1;
  check('reset token expires in ~30 minutes', ttlMinutes >= 25 && ttlMinutes <= 30, `${ttlMinutes}m`);

  // ── Invalid / expired ─────────────────────────────────────────────
  const invalid = await anon.json<{ error: string }>('POST', '/api/auth/reset-password', {
    token: crypto.randomBytes(32).toString('hex'),
    password: newPassword,
  });
  check('invalid token is rejected (400)', invalid.status === 400, String(invalid.status));

  const expiredToken = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetToken: sha256(expiredToken),
      passwordResetExpires: new Date(Date.now() - 60_000),
    },
  });
  const expired = await anon.json<{ error: string }>('POST', '/api/auth/reset-password', {
    token: expiredToken,
    password: newPassword,
  });
  check('expired token is rejected (400)', expired.status === 400, String(expired.status));

  // ── Successful reset + session revocation + single use ────────────
  const validToken = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetToken: sha256(validToken),
      passwordResetExpires: new Date(Date.now() + 20 * 60_000),
    },
  });

  const beforeReset = user.snapshot();
  const reset = await anon.json<{ message: string }>('POST', '/api/auth/reset-password', {
    token: validToken,
    password: newPassword,
  });
  check('valid token resets the password (200)', reset.status === 200, String(reset.status));

  // Old session must no longer resolve to a user.
  const staleSession = new Session();
  staleSession.restore(beforeReset);
  const staleMe = await staleSession.json<{ user: unknown }>('GET', '/api/auth/me');
  check('session issued before the reset is revoked', staleMe.data?.user === null);

  const cleared = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordResetToken: true, passwordResetExpires: true, passwordChangedAt: true },
  });
  check('reset token is deleted after use', cleared?.passwordResetToken === null);
  check('passwordChangedAt is recorded', Boolean(cleared?.passwordChangedAt));

  const reuse = await anon.json<{ error: string }>('POST', '/api/auth/reset-password', {
    token: validToken,
    password: 'AnotherPassword789',
  });
  check('token cannot be reused (400)', reuse.status === 400, String(reuse.status));

  // ── Login with new password, old rejected ─────────────────────────
  const oldLogin = await anon.json('POST', '/api/auth/login', { email, password: oldPassword });
  check('old password is rejected (401)', oldLogin.status === 401, String(oldLogin.status));

  const fresh = new Session();
  await fresh.request('GET', '/api/site/home');
  const newLogin = await fresh.json<{ user: { email: string } }>('POST', '/api/auth/login', {
    email,
    password: newPassword,
  });
  check(
    'login with the new password succeeds',
    newLogin.status === 200 && newLogin.data?.user?.email === email,
    String(newLogin.status)
  );

  // ── Rate limiting ─────────────────────────────────────────────────
  const limiter = new Session();
  await limiter.request('GET', '/api/site/home');
  let saw429 = false;
  for (let i = 0; i < 7; i += 1) {
    const res = await limiter.request('POST', '/api/auth/forgot-password', {
      email: `rate-${i}-${Date.now()}@example.com`,
    });
    if (res.status === 429) {
      saw429 = true;
      break;
    }
  }
  check('forgot-password is rate limited (429)', saw429);

  // ── Cleanup: the throwaway account is local-only ──────────────────
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);

  console.log(`\n${passed} passed, ${failed} failed`);
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
