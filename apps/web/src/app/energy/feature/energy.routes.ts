import { Route } from '@angular/router';

export const energyRoutes: Route[] = [
  {
    path: 'credits',
    loadComponent: () => import('./energie/energie').then((m) => m.Energie),
  },
  { path: 'energie', redirectTo: 'credits' },
  { path: 'recharge', redirectTo: 'credits' },
];
