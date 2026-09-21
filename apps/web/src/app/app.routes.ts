import { Route } from '@angular/router';
import { authRoutes } from './auth/feature/auth.routes';
import { demoRoutes } from './demo/feature/demo.routes';
import { manetteRoutes } from './gamepad/feature/manette.routes';
import { landingRoutes } from './landing/feature/landing.routes';
import { legalRoutes } from './legal/feature/legal.routes';
import { changelogRoutes } from './changelog/feature/changelog.routes';
import { supportRoutes } from './support/feature/support.routes';
import { connectedRoutes } from './layout/connected.routes';
import { uiKitRoutes } from './ui-kit/feature/ui-kit.routes';

export const appRoutes: Route[] = [
  ...landingRoutes,
  ...legalRoutes,
  ...supportRoutes,
  ...changelogRoutes,
  ...demoRoutes,
  ...authRoutes,
  ...uiKitRoutes,
  ...manetteRoutes,
  ...connectedRoutes,
];
