import { Route } from '@angular/router';
import { authGuard } from '../auth/data-access/auth.guard';
import { dashboardRoutes } from '../dashboard/feature/dashboard.routes';

export const connectedRoutes: Route[] = [
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./connected-layout/connected-layout').then(
        (m) => m.ConnectedLayout,
      ),
    children: [
      ...dashboardRoutes,
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
