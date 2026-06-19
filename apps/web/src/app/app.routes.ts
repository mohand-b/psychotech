import { Route } from '@angular/router';
import { authRoutes } from './auth/feature/auth.routes';
import { dashboardRoutes } from './dashboard/feature/dashboard.routes';

export const appRoutes: Route[] = [
  ...authRoutes,
  ...dashboardRoutes,
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
