import axios from 'axios';

/**
 * Normalise the configured API base so both of these work:
 *   VITE_API_URL=https://api.example.com
 *   VITE_API_URL=https://api.example.com/api
 * Every request path below already starts with `/`, so the base must end in `/api`.
 */
function normalizeApiBase(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '/api';
  if (trimmed === '/api' || trimmed.endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
}

function isAbsoluteHttp(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isSameOrigin(value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(value, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

const configured = ((import.meta.env.VITE_API_URL as string | undefined) || '').trim();
const allowRemoteApi = (import.meta.env.VITE_ALLOW_REMOTE_API as string | undefined) === 'true';

/**
 * In this deployment the SPA is served by Cloudflare Pages, which proxies
 * `/api` and `/uploads` to the Express API on the **same origin** (see
 * `functions/_lib/proxy.js`). That proxy is the default and must stay the
 * default:
 *
 *  - session cookies are host-only and `SameSite=Lax`, so a genuinely
 *    cross-origin API would be treated as a third-party and lose its cookies
 *    (login would appear to succeed and then immediately forget the session);
 *  - a stale or unresolvable `VITE_API_URL` (for example an API subdomain with
 *    no DNS record) must not take the entire site offline.
 *
 * A cross-origin `VITE_API_URL` is therefore ignored unless
 * `VITE_ALLOW_REMOTE_API=true` explicitly opts in. Relative values such as
 * `/api` and same-origin absolute URLs are always honoured.
 */
const useConfigured =
  configured.length > 0 &&
  (!isAbsoluteHttp(configured) || isSameOrigin(configured) || allowRemoteApi);

export const API_BASE = normalizeApiBase(useConfigured ? configured : '/api');

/** Origin used for files served outside the `/api` prefix (uploads, PDFs). */
export const API_ORIGIN = API_BASE.replace(/\/api$/, '');

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/** Build an absolute (or proxied) URL for a server file path such as `/api/resources/...`. */
export function apiFileUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path) || path.startsWith('data:')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_ORIGIN}${normalized}`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use((config) => {
  const token = getCookie('tta_csrf');
  if (token) config.headers['x-csrf-token'] = token;
  return config;
});

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; details?: Record<string, string[]> } | undefined;
    if (data?.details && typeof data.details === 'object') {
      const first = Object.values(data.details).flat().filter(Boolean)[0];
      if (first) return first;
    }
    if (data?.error) return data.error;
    if (error.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection and try again.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function fieldErrors(error: unknown): Record<string, string[]> {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { details?: Record<string, string[]> } | undefined;
    return data?.details || {};
  }
  return {};
}

export function assetUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  if (path.startsWith('/uploads') && API_ORIGIN) {
    return `${API_ORIGIN}${path}`;
  }
  return path;
}
