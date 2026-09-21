import { Route } from '@angular/router';
import { RouteSeo, SITE_NAME } from '../../core/seo/route-seo';
import { NOUVEAUTES_PATH } from '../../shared/util/changelog-link';

const NOUVEAUTES_SEO: RouteSeo = {
  title: `Nouveautés | ${SITE_NAME}`,
  description:
    'Le journal des versions de PsychoTech Training : ce qui a été livré et quand, du lancement aux dernières évolutions de la plateforme.',
};

export const changelogRoutes: Route[] = [
  {
    path: NOUVEAUTES_PATH,
    loadComponent: () =>
      import('./nouveautes/nouveautes').then((m) => m.Nouveautes),
    data: { seo: NOUVEAUTES_SEO },
  },
];
