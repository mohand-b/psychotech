import { Route } from '@angular/router';

export const subscriptionsRoutes: Route[] = [
  {
    path: 'abonnements',
    loadComponent: () => import('./offers/offers').then((m) => m.Offers),
  },
  {
    path: 'offres',
    redirectTo: 'abonnements',
  },
];
