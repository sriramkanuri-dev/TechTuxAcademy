// Proxies `/uploads/*` (uploaded images and static assets) to the Render API.
// See `../_lib/proxy.js`.
import { proxyToApi } from '../_lib/proxy.js';

export async function onRequest(context) {
  return proxyToApi(context.request);
}
