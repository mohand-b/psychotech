import { Route } from '@angular/router';
import {
  CANONICAL_ORIGIN,
  RouteSeo,
  SITE_NAME,
} from '../../core/seo/route-seo';
import { SimulationSummaryFacade } from '../../sessions/data-access/simulation-summary.facade';
import { ExampleBilanFacade } from '../data-access/example-bilan.facade';

export const EXAMPLE_BILAN_PATH = 'exemple-de-bilan';

export const EXAMPLE_BILAN_SEO: RouteSeo = {
  title: `Exemple de bilan d'examen blanc | ${SITE_NAME}`,
  description:
    "Découvrez le bilan remis après un examen blanc : score global, verdict d'admissibilité, détail des 5 axes et recommandations d'entraînement. Exemple sur données fictives.",
  structuredData: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: "Exemple de bilan d'examen blanc",
      url: `${CANONICAL_ORIGIN}/${EXAMPLE_BILAN_PATH}`,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME },
      inLanguage: 'fr',
    },
  ],
};

export const demoRoutes: Route[] = [
  {
    path: EXAMPLE_BILAN_PATH,
    data: { seo: EXAMPLE_BILAN_SEO, demo: true, hideMobileNav: true },
    providers: [
      { provide: SimulationSummaryFacade, useClass: ExampleBilanFacade },
    ],
    loadComponent: () =>
      import(
        '../../sessions/feature/simulation-summary/simulation-summary'
      ).then((m) => m.SimulationSummary),
  },
];
