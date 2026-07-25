import { Route } from '@angular/router';
import { authGuard } from '../auth/data-access/auth.guard';
import { dashboardRoutes } from '../dashboard/feature/dashboard.routes';
import { energyRoutes } from '../energy/feature/energy.routes';
import { entrainementsRoutes } from '../entrainements/feature/entrainements.routes';
import { profileRoutes } from '../profile/feature/profile.routes';
import { progressionRoutes } from '../progression/feature/progression.routes';
import { sessionsRoutes } from '../sessions/feature/sessions.routes';
import { subscriptionsRoutes } from '../subscriptions/feature/subscriptions.routes';

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
      ...energyRoutes,
      ...entrainementsRoutes,
      ...sessionsRoutes,
      ...profileRoutes,
      ...progressionRoutes,
      ...subscriptionsRoutes,
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
