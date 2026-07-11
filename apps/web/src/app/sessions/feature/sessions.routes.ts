import { Route } from '@angular/router';

export const sessionsRoutes: Route[] = [
  {
    path: 'sessions',
    loadComponent: () => import('./sessions/sessions').then((m) => m.Sessions),
  },
  {
    path: 'sessions/:sessionId/resultat',
    data: { hideMobileNav: true },
    loadComponent: () =>
      import('./simulation-summary/simulation-summary').then(
        (m) => m.SimulationSummary,
      ),
  },
];
