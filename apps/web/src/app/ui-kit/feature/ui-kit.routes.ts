import { Route } from '@angular/router';

export const uiKitRoutes: Route[] = [
  {
    path: 'ui-kit',
    loadComponent: () => import('./ui-kit/ui-kit').then((m) => m.UiKit),
  },
];
