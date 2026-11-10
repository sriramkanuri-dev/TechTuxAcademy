// Proxies `/api/*` to the Render Express API. See `../_lib/proxy.js`.
import { proxyToApi } from '../_lib/proxy.js';

export async function onRequest(context) {
  return proxyToApi(context.request);
}
