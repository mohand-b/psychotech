import { Route } from '@angular/router';

export const entrainementsRoutes: Route[] = [
  {
    path: 'entrainements',
    loadComponent: () =>
      import('./entrainements/entrainements').then((m) => m.Entrainements),
  },
];
