// Lanceur du jeu de données de démonstration.
//   node apps/api/tools/demo-dataset/run.js            peuple le compte
//   node apps/api/tools/demo-dataset/run.js --reset    le remet à zéro
//
// Charge apps/api/.env, vise donc exactement la base que sert l'API locale, et
// n'autorise que cet hôte-là au garde-fou du script.
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../../..');
require('dotenv').config({ path: path.join(repoRoot, 'apps/api/.env') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL absente de apps/api/.env');
  process.exit(1);
}

// Un compte de démonstration ne doit jamais déclencher d'e-mail réel : sans
// clé, le module de mail bascule sur le LogMailer.
process.env.RESEND_API_KEY = '';

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
