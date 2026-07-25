import { Route } from '@angular/router';

export const profileRoutes: Route[] = [
  {
    path: 'profil',
    loadComponent: () => import('./profile/profile').then((m) => m.Profile),
    data: { hideMobileNav: true, hideMobileHeader: true },
  },
];
