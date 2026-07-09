import { Route } from '@angular/router';

export const manetteRoutes: Route[] = [
  {
    path: 'manette',
    loadComponent: () => import('./manette/manette').then((m) => m.Manette),
  },
];
