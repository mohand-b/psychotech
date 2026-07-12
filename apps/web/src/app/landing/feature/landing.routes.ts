import { Route } from '@angular/router';
import { guestGuard } from '../../auth/data-access/auth.guard';

export const landingRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    canMatch: [guestGuard],
    loadComponent: () => import('./landing/landing').then((m) => m.Landing),
  },
];
