// Shared Cloudflare Pages Function helper — same-origin proxy to the Render API.
//
// The SPA is built with a relative API base (`/api`) and loads files from
// `/uploads`, so it works on any host (techtuxacademy.online, www, or the
// *.pages.dev preview). Cloudflare Pages `_redirects` cannot proxy external
// domains, so the Functions in `functions/api` and `functions/uploads` forward
// those paths to the Render service.
//
// Because the browser only ever talks to the Pages host, auth cookies stay
// first-party and are not blocked as third-party cookies. The API must be
// configured with a host-only cookie (`COOKIE_DOMAIN=`) and
// `COOKIE_SAMESITE=lax` so the cookies are accepted on whichever host serves
// the page.

const API_ORIGIN = 'https://techtux-api.onrender.com';

// Canonical site origin. The API validates `Origin` against its CORS allowlist;
// server-side requests from Pages should look like the canonical site rather
// than a preview host.
const SITE_ORIGIN = 'https://techtuxacademy.online';

const STRIP_REQUEST_HEADERS = [
  'host',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'x-forwarded-proto',
  'x-real-ip',
  // Hop-by-hop headers must not be forwarded.
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
];

const STRIP_RESPONSE_HEADERS = [
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
];

export async function proxyToApi(request) {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, API_ORIGIN);

  const headers = new Headers(request.headers);
  // Preserve the real client IP for the API's rate limiter. Cloudflare sets
  // `cf-connecting-ip` and does not let the browser override it; without this,
  // every proxied request looks like it came from the Worker's egress IP.
  const clientIp = request.headers.get('cf-connecting-ip');
  for (const name of STRIP_REQUEST_HEADERS) headers.delete(name);
  if (clientIp) headers.set('x-forwarded-for', clientIp);
  headers.set('origin', SITE_ORIGIN);
  if (!headers.has('referer')) headers.set('referer', `${SITE_ORIGIN}/`);

  const method = request.method;
  const init = { method, headers, redirect: 'manual' };
  if (method !== 'GET' && method !== 'HEAD') init.body = request.body;

  const response = await fetch(target.toString(), init);

  // Copy headers manually so multiple `Set-Cookie` values survive.
  const out = new Headers();
  for (const [key, value] of response.headers) {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie') continue;
    if (STRIP_RESPONSE_HEADERS.includes(lower)) continue;
    out.append(key, value);
  }

  const cookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];
  for (const cookie of cookies) out.append('set-cookie', cookie);

  // Lets us confirm which Pages build is serving traffic without exposing
  // anything sensitive.
  out.set('x-tta-proxy', 'pages-functions/2');

  return new Response(method === 'HEAD' ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: out,
  });
}
