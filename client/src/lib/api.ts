import axios from 'axios';

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

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
  if (path.startsWith('/uploads') && API_BASE.startsWith('http')) {
    return `${API_BASE.replace(/\/api$/, '')}${path}`;
  }
  return path;
}
