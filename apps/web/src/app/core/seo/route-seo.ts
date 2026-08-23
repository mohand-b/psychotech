export const CANONICAL_ORIGIN = 'https://psychotechtraining.com';
export const SITE_NAME = 'PsychoTech Training';
export const SITE_TAGLINE = 'Tests psychotechniques ferroviaires';
export const SITE_COPYRIGHT_YEAR = 2026;
export const OG_IMAGE_PATH = '/og-image.jpg';
export const LANDING_DISPLAY_FONT_PATH =
  '/fonts/space-grotesk-latin-600-normal.woff2';

export interface RouteSeo {
  title: string;
  description: string;
  structuredData?: object[];
  preloadFonts?: string[];
}

export const APP_FALLBACK_SEO: RouteSeo = {
  title: SITE_NAME,
  description:
    'Espace candidat PsychoTech Training : entraînement aux épreuves psychotechniques des sélections professionnelles.',
};
