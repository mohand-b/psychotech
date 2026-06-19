import { Route } from '@angular/router';
import { authGuard } from '../../auth/data-access/auth.guard';

export const dashboardRoutes: Route[] = [
  {
    path: 'dashboard',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
];
