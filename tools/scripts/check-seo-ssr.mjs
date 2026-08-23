// Contrôle le HTML réellement produit par le rendu serveur, avant toute
// hydratation : ce que voit un robot d'indexation qui n'exécute pas le
// JavaScript. Un signal injecté seulement côté client passerait inaperçu ici,
// et c'est précisément ce qu'on veut détecter.
//   node tools/scripts/check-seo-ssr.mjs
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const browserDir = join(repoRoot, 'dist/apps/web/browser');

const SITE_NAME = 'PsychoTech Training';
const LEGAL_ROUTES = ['/mentions-legales', '/confidentialite', '/cgv', '/cgu'];

const HOME_LINK_PATTERN = new RegExp(
  `<a\\b[^>]*\\bhref="/"[^>]*>\\s*${SITE_NAME}\\s*</a>`,
);

function fileFor(route) {
  return route === '/'
    ? join(browserDir, 'index.html')
    : join(browserDir, route.slice(1), 'index.html');
}

function websiteNode(html) {
  const scripts = html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  );
  for (const [, raw] of scripts) {
    const node = JSON.parse(raw);
    if (node['@type'] === 'WebSite') {
      return node;
    }
  }
  return null;
}

const failures = [];

function check(route, label, passed) {
  if (!passed) {
    failures.push(`${route} — ${label}`);
  }
  console.log(`  ${passed ? 'ok  ' : 'FAIL'} ${route} — ${label}`);
}

const homeHtml = await readFile(fileFor('/'), 'utf8');

console.log('Home:');
const website = websiteNode(homeHtml);
check('/', 'JSON-LD WebSite présent dans le HTML serveur', website !== null);
check('/', `WebSite.name vaut « ${SITE_NAME} »`, website?.name === SITE_NAME);
check(
  '/',
  'WebSite.alternateName ne propose pas le domaine nu',
  !(website?.alternateName ?? []).some((name) => name.includes('.')),
);
check(
  '/',
  `og:site_name vaut « ${SITE_NAME} »`,
  homeHtml.includes(`<meta property="og:site_name" content="${SITE_NAME}">`),
);
check('/', 'lien texte vers la home dans le pied de page', HOME_LINK_PATTERN.test(homeHtml));

console.log('Pages légales:');
for (const route of LEGAL_ROUTES) {
  const html = await readFile(fileFor(route), 'utf8');
  check(
    route,
    `og:site_name vaut « ${SITE_NAME} »`,
    html.includes(`<meta property="og:site_name" content="${SITE_NAME}">`),
  );
  check(route, `nom complet « ${SITE_NAME} » en texte réel`, html.includes(SITE_NAME));
  check(route, 'lien vers la home ancré sur le nom du site', HOME_LINK_PATTERN.test(html));
}

if (failures.length > 0) {
  console.error(`\n${failures.length} contrôle(s) en échec:`);
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}
console.log('\nTous les signaux sont présents dans le HTML serveur.');
