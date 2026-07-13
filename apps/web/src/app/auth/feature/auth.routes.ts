import { Route } from '@angular/router';
import { guestGuard } from '../data-access/auth.guard';

export const authRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        canMatch: [guestGuard],
        data: {
          brandTitle: 'Reprenez votre préparation.',
          brandDeco: true,
        },
        loadComponent: () => import('./login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        canMatch: [guestGuard],
        data: {
          brandTitle: 'Commencez gratuitement, sans carte bancaire.',
        },
        loadComponent: () =>
          import('./register/register').then((m) => m.Register),
      },
    ],
  },
];
