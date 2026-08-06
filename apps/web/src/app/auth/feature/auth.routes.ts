import { Route } from '@angular/router';
import { authGuard, guestGuard } from '../data-access/auth.guard';

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
      {
        path: 'verification',
        loadComponent: () =>
          import('./verification/verification').then((m) => m.Verification),
      },
      {
        path: 'verification-email',
        canMatch: [authGuard],
        loadComponent: () =>
          import('./verification-pending/verification-pending').then(
            (m) => m.VerificationPending,
          ),
      },
    ],
  },
];
