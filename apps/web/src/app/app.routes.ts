import { Route } from '@angular/router';
import { authRoutes } from './auth/feature/auth.routes';
import { demoRoutes } from './demo/feature/demo.routes';
import { manetteRoutes } from './gamepad/feature/manette.routes';
import { landingRoutes } from './landing/feature/landing.routes';
import { legalRoutes } from './legal/feature/legal.routes';
import { connectedRoutes } from './layout/connected.routes';
import { uiKitRoutes } from './ui-kit/feature/ui-kit.routes';

export const appRoutes: Route[] = [
  ...landingRoutes,
  ...legalRoutes,
  ...demoRoutes,
  ...authRoutes,
  ...uiKitRoutes,
  ...manetteRoutes,
  ...connectedRoutes,
];
