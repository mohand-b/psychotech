import { Route } from '@angular/router';

export const landingRoutes: Route[] = [
  {
    path: 'landing',
    loadComponent: () => import('./landing/landing').then((m) => m.Landing),
  },
];
