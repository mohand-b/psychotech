import { Route } from '@angular/router';
import {
  CANONICAL_ORIGIN,
  LANDING_DISPLAY_FONT_PATH,
  OG_IMAGE_PATH,
  RouteSeo,
  SITE_NAME,
} from '../../core/seo/route-seo';
import { LANDING_FAQ_ENTRIES } from '../data/landing-faq-entries';

const LANDING_STRUCTURED_DATA: object[] = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: CANONICAL_ORIGIN,
    logo: `${CANONICAL_ORIGIN}${OG_IMAGE_PATH}`,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: ['PsychoTechTraining', 'psychotechtraining.com'],
    url: `${CANONICAL_ORIGIN}/`,
    inLanguage: 'fr',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: LANDING_FAQ_ENTRIES.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  },
];

export const LANDING_SEO: RouteSeo = {
  title: 'Tests psychotechniques ferroviaires : entraînement en ligne',
  description:
    "Entraînez-vous aux 5 familles d'épreuves psychotechniques des sélections ferroviaires : logique, mémoire, discrimination visuelle, réactivité et motricité.",
  structuredData: LANDING_STRUCTURED_DATA,
  preloadFonts: [LANDING_DISPLAY_FONT_PATH],
};

const TARIFS_SEO: RouteSeo = {
  title: 'Tarifs : packs de crédits sans abonnement | PsychoTech Training',
  description:
    'Des packs de crédits sans abonnement pour préparer les épreuves psychotechniques ferroviaires : 15, 50 ou 120 crédits, paiement unique, sans expiration.',
  preloadFonts: [LANDING_DISPLAY_FONT_PATH],
};

export const landingRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./landing/landing').then((m) => m.Landing),
    data: { seo: LANDING_SEO },
  },
  {
    path: 'tarifs',
    loadComponent: () => import('./tarifs/tarifs').then((m) => m.Tarifs),
    data: { seo: TARIFS_SEO },
  },
];
