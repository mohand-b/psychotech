import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANONICAL_ORIGIN = 'https://psychotechtraining.com';
const PUBLIC_ROUTES = [
  '/',
  '/tarifs',
  '/mentions-legales',
  '/confidentialite',
  '/cgv',
  '/cgu',
  '/login',
  '/register',
];

const lastmod = new Date().toISOString().split('T')[0];
const urls = PUBLIC_ROUTES.map((route) => {
  const loc = route === '/' ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${route}`;
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
}).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

const target = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'sitemap.xml',
);
writeFileSync(target, sitemap);
console.log(`sitemap.xml written with ${PUBLIC_ROUTES.length} routes`);
