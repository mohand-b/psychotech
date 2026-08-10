import { Route } from '@angular/router';

export const landingRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./landing/landing').then((m) => m.Landing),
  },
  {
    path: 'tarifs',
    loadComponent: () => import('./tarifs/tarifs').then((m) => m.Tarifs),
  },
];
