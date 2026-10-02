import { Route } from '@angular/router';

export const OLD_LANDING_PATH = 'old-landing-page';

export const oldLandingRoutes: Route[] = [
  {
    path: OLD_LANDING_PATH,
    loadComponent: () =>
      import('./old-landing/old-landing').then((m) => m.OldLanding),
  },
];
