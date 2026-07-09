import { Route } from '@angular/router';

export const sessionsRoutes: Route[] = [
  {
    path: 'sessions',
    loadComponent: () => import('./sessions/sessions').then((m) => m.Sessions),
  },
  {
    path: 'sessions/:sessionId/resultat',
    loadComponent: () =>
      import('./session-result/session-result').then((m) => m.SessionResult),
  },
];
