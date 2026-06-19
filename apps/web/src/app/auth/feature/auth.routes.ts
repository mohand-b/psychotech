import { Route } from '@angular/router';
import { guestGuard } from '../data-access/auth.guard';

export const authRoutes: Route[] = [
  {
    path: 'login',
    canMatch: [guestGuard],
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canMatch: [guestGuard],
    loadComponent: () => import('./register/register').then((m) => m.Register),
  },
];
