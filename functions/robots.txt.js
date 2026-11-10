// Proxies the API-generated robots.txt to the Pages host. See `../_lib/proxy.js`.
import { proxyToApi } from '../_lib/proxy.js';

export async function onRequest(context) {
  return proxyToApi(context.request);
}
