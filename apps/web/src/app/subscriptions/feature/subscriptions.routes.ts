import { Route } from '@angular/router';

export const subscriptionsRoutes: Route[] = [
  {
    path: 'offres',
    loadComponent: () => import('./offers/offers').then((m) => m.Offers),
  },
];
