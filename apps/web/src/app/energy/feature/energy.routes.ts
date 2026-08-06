import { Route } from '@angular/router';

export const energyRoutes: Route[] = [
  {
    path: 'energie',
    loadComponent: () => import('./energie/energie').then((m) => m.Energie),
  },
  { path: 'recharge', redirectTo: 'energie' },
];
