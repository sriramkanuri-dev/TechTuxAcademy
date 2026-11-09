/**
 * End-to-end API smoke test for TechTuxAcademy.
 *
 * Usage:
 *   npm run test:api -w server
 *
 * Requires the API to be running (npm run dev -w server) and the database to be
 * seeded (npm run db:seed -w server). The script uses the demo credentials from
 * server/.env and never mutates content destructively.
 */
import 'dotenv/config';

const BASE = (process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, '');
const STUDENT_EMAIL = process.env.SEED_STUDENT_EMAIL || 'student@techtuxacademy.online';
const STUDENT_PASSWORD = process.env.SEED_STUDENT_PASSWORD || 'Student@12345';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@techtuxacademy.online';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
const DEMO_CERTIFICATE = process.env.DEMO_CERTIFICATE_ID || 'TTA-2026-DEMO0001';

let passed = 0;
let failed = 0;

function pass(name: string) {
  passed += 1;
  console.log(`  \u2713 ${name}`);
}

function fail(name: string, detail: string) {
  failed += 1;
  console.error(`  \u2717 ${name}`);
  console.error(`      ${detail}`);
}

class Session {
  private cookies = new Map<string, string>();
  csrf = '';

  private store(res: Response) {
    const setCookies =
      typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : ([] as string[]);
    for (const raw of setCookies) {
      const pair = raw.split(';')[0];
      const index = pair.indexOf('=');
      if (index === -1) continue;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1);
      if (!value) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    const csrf = this.cookies.get('tta_csrf');
    if (csrf) this.csrf = csrf;
  }

  private cookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  async request(
    method: string,
    path: string,
    body?: unknown,
    options: { skipCsrf?: boolean } = {}
  ): Promise<Response> {
    const headers: Record<string, string> = {};
    const cookie = this.cookieHeader();
    if (cookie) headers.cookie = cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !options.skipCsrf && this.csrf) {
      headers['x-csrf-token'] = this.csrf;
    }
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    });
    this.store(res);
    return res;
  }
}

async function expectStatus(res: Response, expected: number, label: string) {
  if (res.status !== expected) {
    const text = await res.text();
    throw new Error(`${label}: expected HTTP ${expected}, got ${res.status} — ${text.slice(0, 400)}`);
  }
}

async function expectJson<T>(res: Response, expected: number, label: string): Promise<T> {
  await expectStatus(res, expected, label);
  return (await res.json()) as T;
}

async function run(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    pass(name);
  } catch (error) {
    fail(name, error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  console.log(`\nTechTuxAcademy API test — ${BASE}\n`);

  const anon = new Session();
  const student = new Session();
  const admin = new Session();

  let courseSlug = '';
  let courseId = '';

  // ── Public endpoints ──────────────────────────────────────────────
  await run('GET /api/health returns ok', async () => {
    const res = await anon.request('GET', '/api/health');
    const json = await expectJson<{ status: string }>(res, 200, 'health');
    if (json.status !== 'ok') throw new Error(`unexpected status: ${json.status}`);
  });

  await run('GET /api/site/home returns live stats and content', async () => {
    const res = await anon.request('GET', '/api/site/home');
    const json = await expectJson<{ stats: Record<string, number>; categories: unknown[] }>(
      res,
      200,
      'site home'
    );
    if (!json.stats || typeof json.stats.courses !== 'number') {
      throw new Error('stats.courses missing');
    }
    if (!Array.isArray(json.categories) || json.categories.length === 0) {
      throw new Error('categories empty');
    }
  });

  await run('GET /api/courses lists published courses', async () => {
    const res = await anon.request('GET', '/api/courses?limit=5');
    const json = await expectJson<{ courses: { slug: string; id: string }[] }>(res, 200, 'courses');
    if (!json.courses.length) throw new Error('no courses returned');
    courseSlug = json.courses[0].slug;
    courseId = json.courses[0].id;
  });

  await run('GET /api/courses/:slug returns course detail', async () => {
    const res = await anon.request('GET', `/api/courses/${courseSlug}`);
    const json = await expectJson<{ course: { slug: string } }>(res, 200, 'course detail');
    if (json.course.slug !== courseSlug) throw new Error('slug mismatch');
  });

  await run('GET /api/search finds results', async () => {
    const res = await anon.request('GET', '/api/search?q=linux');
    const json = await expectJson<{ results?: unknown[]; courses?: unknown[] }>(res, 200, 'search');
    const total =
      (Array.isArray(json.results) ? json.results.length : 0) +
      (Array.isArray(json.courses) ? json.courses.length : 0);
    if (total === 0) throw new Error('search returned no results for "linux"');
  });

  await run('GET /api/search/suggest returns suggestions', async () => {
    const res = await anon.request('GET', '/api/search/suggest?q=py');
    await expectStatus(res, 200, 'search suggest');
  });

  await run('GET /sitemap.xml and /robots.txt are served', async () => {
    const sitemap = await anon.request('GET', '/sitemap.xml');
    await expectStatus(sitemap, 200, 'sitemap');
    const robots = await anon.request('GET', '/robots.txt');
    await expectStatus(robots, 200, 'robots');
  });

  // ── Authentication ────────────────────────────────────────────────
  await run('unauthenticated dashboard request is rejected (401)', async () => {
    const res = await anon.request('GET', '/api/me/dashboard');
    await expectStatus(res, 401, 'anonymous dashboard');
  });

  await run('state-changing request without CSRF header is rejected (403)', async () => {
    const res = await anon.request(
      'POST',
      '/api/auth/login',
      { email: STUDENT_EMAIL, password: STUDENT_PASSWORD },
      { skipCsrf: true }
    );
    await expectStatus(res, 403, 'csrf rejection');
  });

  await run('student login succeeds and sets a session', async () => {
    // Prime the double-submit CSRF cookie before the first mutation.
    await student.request('GET', '/api/site/home');
    const res = await student.request('POST', '/api/auth/login', {
      email: STUDENT_EMAIL,
      password: STUDENT_PASSWORD,
    });
    const json = await expectJson<{ user: { role: string; email: string } }>(res, 200, 'student login');
    if (json.user.email !== STUDENT_EMAIL) throw new Error('email mismatch');
  });

  await run('GET /api/auth/me returns the signed-in user', async () => {
    const res = await student.request('GET', '/api/auth/me');
    const json = await expectJson<{ user: { email: string } | null }>(res, 200, 'auth me');
    if (!json.user || json.user.email !== STUDENT_EMAIL) throw new Error('user not returned');
  });

  // ── Student learning ──────────────────────────────────────────────
  await run('GET /api/me/dashboard returns live progress data', async () => {
    const res = await student.request('GET', '/api/me/dashboard');
    const json = await expectJson<{ stats: Record<string, number> }>(res, 200, 'dashboard');
    if (typeof json.stats.enrolledCourses !== 'number') throw new Error('stats missing');
  });

  await run('GET /api/me/enrollments returns enrolments', async () => {
    const res = await student.request('GET', '/api/me/enrollments');
    const json = await expectJson<{ enrollments: unknown[] }>(res, 200, 'enrollments');
    if (!Array.isArray(json.enrollments)) throw new Error('enrollments not an array');
  });

  await run('GET /api/me/certificates returns certificates', async () => {
    const res = await student.request('GET', '/api/me/certificates');
    const json = await expectJson<{ certificates: unknown[] }>(res, 200, 'my certificates');
    if (!Array.isArray(json.certificates)) throw new Error('certificates not an array');
  });

  await run('enrol (idempotent) and fetch learning view', async () => {
    const enroll = await student.request('POST', `/api/me/enroll/${courseId}`);
    await expectStatus(enroll, 201, 'enrol');
    const view = await student.request('GET', `/api/me/courses/${courseSlug}`);
    const json = await expectJson<{ course: { lessons: { id: string }[] }; progress: unknown }>(
      view,
      200,
      'learning view'
    );
    if (!json.course.lessons.length) throw new Error('course has no lessons');
  });

  await run('mark a lesson complete (idempotent re-complete)', async () => {
    const view = await student.request('GET', `/api/me/courses/${courseSlug}`);
    const json = (await view.json()) as {
      course: { lessons: { id: string }[] };
      progress: { completedLessonIds: string[] } | null;
    };
    const lessonId =
      json.progress?.completedLessonIds?.[0] || json.course.lessons[0]?.id;
    if (!lessonId) throw new Error('no lesson available');
    const res = await student.request('POST', `/api/me/lessons/${lessonId}/complete`, {
      completed: true,
    });
    const result = await expectJson<{ progress: { percent: number } }>(res, 200, 'complete lesson');
    if (typeof result.progress.percent !== 'number') throw new Error('progress missing');
  });

  await run('student cannot access admin API (403)', async () => {
    const res = await student.request('GET', '/api/admin/stats');
    await expectStatus(res, 403, 'student -> admin');
  });

  // ── Certificates ──────────────────────────────────────────────────
  await run('public certificate verification works', async () => {
    const res = await anon.request('GET', `/api/certificates/verify/${DEMO_CERTIFICATE}`);
    const json = await expectJson<{ certificate: { certificateId: string } }>(
      res,
      200,
      'verify certificate'
    );
    if (json.certificate.certificateId !== DEMO_CERTIFICATE) throw new Error('id mismatch');
  });

  await run('certificate PDF downloads as application/pdf', async () => {
    const res = await anon.request('GET', `/api/certificates/${DEMO_CERTIFICATE}/pdf`);
    await expectStatus(res, 200, 'certificate pdf');
    const type = res.headers.get('content-type') || '';
    if (!type.includes('application/pdf')) throw new Error(`unexpected content-type: ${type}`);
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 1000) throw new Error(`PDF too small: ${buffer.byteLength} bytes`);
  });

  // ── Admin ─────────────────────────────────────────────────────────
  await run('admin login succeeds', async () => {
    await admin.request('GET', '/api/site/home');
    const res = await admin.request('POST', '/api/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    const json = await expectJson<{ user: { role: string } }>(res, 200, 'admin login');
    if (json.user.role !== 'ADMIN') throw new Error('role is not ADMIN');
  });

  await run('GET /api/admin/stats returns live totals', async () => {
    const res = await admin.request('GET', '/api/admin/stats');
    const json = await expectJson<{ stats: Record<string, number> }>(res, 200, 'admin stats');
    if (typeof json.stats.totalCourses !== 'number') throw new Error('stats missing');
  });

  await run('admin users list returns pagination', async () => {
    const res = await admin.request('GET', '/api/admin/users?limit=5');
    const json = await expectJson<{ users: unknown[]; pagination: { total: number } }>(
      res,
      200,
      'admin users'
    );
    if (!Array.isArray(json.users)) throw new Error('users not an array');
  });

  await run('admin certificates list returns pagination', async () => {
    const res = await admin.request('GET', '/api/admin/certificates?limit=5');
    await expectJson<{ certificates: unknown[] }>(res, 200, 'admin certificates');
  });

  await run('admin enrolments list returns pagination', async () => {
    const res = await admin.request('GET', '/api/admin/enrollments?limit=5');
    await expectJson<{ enrollments: unknown[] }>(res, 200, 'admin enrollments');
  });

  await run('admin settings round-trip (no-op save)', async () => {
    const get = await admin.request('GET', '/api/admin/settings');
    const json = await expectJson<{ settings: Record<string, unknown> }>(get, 200, 'get settings');
    const siteName = String(json.settings.siteName ?? 'TechTuxAcademy');
    const put = await admin.request('PUT', '/api/admin/settings', { siteName });
    await expectJson<{ settings: Record<string, unknown> }>(put, 200, 'save settings');
  });

  await run('admin categories/tutorials/posts lists respond', async () => {
    for (const path of ['/api/categories/admin/all', '/api/tutorials/admin/all', '/api/posts/admin/all']) {
      const res = await admin.request('GET', path);
      await expectStatus(res, 200, path);
    }
  });

  // ── Logout ────────────────────────────────────────────────────────
  await run('logout clears the session', async () => {
    const res = await student.request('POST', '/api/auth/logout');
    await expectStatus(res, 200, 'logout');
    const me = await student.request('GET', '/api/auth/me');
    const json = await expectJson<{ user: unknown | null }>(me, 200, 'me after logout');
    if (json.user) throw new Error('session still active after logout');
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exitCode = 1;
});
