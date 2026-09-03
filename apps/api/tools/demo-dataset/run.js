// Lanceur du jeu de données de démonstration.
//   node apps/api/tools/demo-dataset/run.js            peuple le compte
//   node apps/api/tools/demo-dataset/run.js --reset    le remet à zéro
//
// Charge apps/api/.env, vise donc exactement la base que sert l'API locale, et
// n'autorise que cet hôte-là au garde-fou du script.
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../../..');
require('dotenv').config({ path: path.join(repoRoot, 'apps/api/.env') });

// Sous `railway run`, l'URL injectée par défaut pointe vers l'hôte interne
// (*.railway.internal), inaccessible hors du réseau Railway : l'URL publique
// prime quand elle est fournie.
if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL absente de apps/api/.env');
  process.exit(1);
}

// Un compte de démonstration ne doit jamais déclencher d'e-mail réel : sans
// clé, le module de mail bascule sur le LogMailer.
process.env.RESEND_API_KEY = '';

// Sur une base distante, la latence par requête fait expirer les transactions
// interactives aux timeouts Prisma par défaut (2 s / 5 s).
process.env.PRISMA_TRANSACTION_MAX_WAIT_MS =
  process.env.PRISMA_TRANSACTION_MAX_WAIT_MS ?? '30000';
process.env.PRISMA_TRANSACTION_TIMEOUT_MS =
  process.env.PRISMA_TRANSACTION_TIMEOUT_MS ?? '120000';

const host = new URL(process.env.DATABASE_URL).hostname;
process.env.DEMO_DATASET_DEV_HOST = process.env.DEMO_DATASET_DEV_HOST ?? host;
console.log(`Base ciblée : ${host}`);

require('ts-node').register({
  project: path.join(repoRoot, 'apps/api/tools/tsconfig.tools.json'),
  transpileOnly: true,
});
require('tsconfig-paths').register({
  baseUrl: repoRoot,
  paths: { '@psychotech/shared': ['libs/shared/src/index.ts'] },
});

require('./main.ts');
