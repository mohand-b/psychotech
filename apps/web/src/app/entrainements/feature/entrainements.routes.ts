import { Route } from '@angular/router';

export const entrainementsRoutes: Route[] = [
  {
    path: 'entrainements',
    loadComponent: () =>
      import('./entrainements/entrainements').then((m) => m.Entrainements),
  },
  {
    path: 'entrainements/choisir-axe',
    data: {
      focusedHeader: {
        title: 'Entraînement ciblé',
        backLabel: 'Entraînements',
        backLink: '/entrainements',
      },
    },
    loadComponent: () =>
      import('./axis-selection/axis-selection').then((m) => m.AxisSelection),
  },
  {
    path: 'entrainements/cible/:axis',
    data: {
      focusedHeader: {
        backLabel: 'Entraînement ciblé',
        backLink: '/entrainements/choisir-axe',
        closeLink: '/entrainements',
        axisParam: 'axis',
      },
    },
    loadComponent: () =>
      import('./axis-start/axis-start').then((m) => m.AxisStart),
  },
];
