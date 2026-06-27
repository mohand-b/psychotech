import { Route } from '@angular/router';

export const dashboardRoutes: Route[] = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
];
