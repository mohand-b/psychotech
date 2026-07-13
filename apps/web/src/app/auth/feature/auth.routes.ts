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
        loadComponent: () => import('./login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        canMatch: [guestGuard],
        loadComponent: () =>
          import('./register/register').then((m) => m.Register),
      },
    ],
  },
];
