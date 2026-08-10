export const CANONICAL_ORIGIN = 'https://psychotechtraining.com';
export const SITE_NAME = 'PsychoTech Training';
export const OG_IMAGE_PATH = '/og-image.jpg';

export interface RouteSeo {
  title: string;
  description: string;
  structuredData?: object[];
}

export const APP_FALLBACK_SEO: RouteSeo = {
  title: SITE_NAME,
  description:
    'Espace candidat PsychoTech Training : entraînement aux épreuves psychotechniques des sélections professionnelles.',
};
