import { Route } from '@angular/router';
import { authRoutes } from './auth/feature/auth.routes';
import { manetteRoutes } from './gamepad/feature/manette.routes';
import { landingRoutes } from './landing/feature/landing.routes';
import { connectedRoutes } from './layout/connected.routes';
import { uiKitRoutes } from './ui-kit/feature/ui-kit.routes';

export const appRoutes: Route[] = [
  ...landingRoutes,
  ...authRoutes,
  ...uiKitRoutes,
  ...manetteRoutes,
  ...connectedRoutes,
];
