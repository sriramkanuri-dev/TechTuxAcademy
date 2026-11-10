// Generates `dist/sitemap.xml` at build time.
//
// The Express API already builds a complete sitemap (static pages + published
// courses, tutorials, posts and categories) at `/sitemap.xml`. Cloudflare Pages
// cannot proxy an external origin from `_redirects`, and adding a Pages Function
// for `/sitemap.xml` broke the Pages build, so instead we snapshot the API's
// sitemap into the static build output.
//
// The fetch is best-effort: if Render is asleep, slow or unreachable the build
// still succeeds and falls back to the core public routes. Run
// `npm run build -w client` again (or rebuild Pages) to pick up new content.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SITE = 'https://techtuxacademy.online';
const SOURCE = process.env.SITEMAP_SOURCE || 'https://techtux-api.onrender.com/sitemap.xml';
const TIMEOUT_MS = Number(process.env.SITEMAP_TIMEOUT_MS || 25000);

const STATIC_PATHS = [
  '',
  '/about',
  '/courses',
  '/tutorials',
  '/blog',
  '/categories',
  '/contact',
  '/search',
  '/verify-certificate',
  '/login',
  '/register',
];

function fallbackSitemap() {
  const today = new Date().toISOString().split('T')[0];
  const body = STATIC_PATHS.map(
    (route) => `  <url><loc>${SITE}${route}</loc><lastmod>${today}</lastmod></url>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

async function fetchSitemap() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(SOURCE, {
      signal: controller.signal,
      headers: { accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();
    if (!xml.trimStart().startsWith('<?xml') || !xml.includes('<urlset')) {
      throw new Error('response was not a sitemap');
    }
    return xml.endsWith('\n') ? xml : `${xml}\n`;
  } finally {
    clearTimeout(timer);
  }
}

let xml;
let source = 'API';
try {
  xml = await fetchSitemap();
} catch (error) {
  source = `fallback (${error instanceof Error ? error.message : String(error)})`;
  xml = fallbackSitemap();
}

const outFile = path.resolve(process.cwd(), 'dist', 'sitemap.xml');
await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, xml, 'utf8');

const urls = (xml.match(/<url>/g) || []).length;
console.log(`sitemap.xml: ${urls} URLs from ${source} → ${outFile}`);
