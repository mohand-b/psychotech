import { Route } from '@angular/router';

export const sessionsRoutes: Route[] = [
  {
    path: 'sessions',
    loadComponent: () => import('./sessions/sessions').then((m) => m.Sessions),
  },
];
