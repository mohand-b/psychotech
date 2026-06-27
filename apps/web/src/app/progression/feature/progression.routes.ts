import { Route } from '@angular/router';

export const progressionRoutes: Route[] = [
  {
    path: 'progression',
    loadComponent: () =>
      import('./progression/progression').then((m) => m.Progression),
  },
];
