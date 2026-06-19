import { Route } from '@angular/router';
import { authRoutes } from './auth/feature/auth.routes';
import { dashboardRoutes } from './dashboard/feature/dashboard.routes';
import { uiKitRoutes } from './ui-kit/feature/ui-kit.routes';

export const appRoutes: Route[] = [
  ...authRoutes,
  ...dashboardRoutes,
  ...uiKitRoutes,
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
