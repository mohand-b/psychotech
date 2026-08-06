import { Route } from '@angular/router';

export const badgesRoutes: Route[] = [
  {
    path: 'badges',
    loadComponent: () =>
      import('./badges-page/badges-page').then((m) => m.BadgesPage),
  },
];
