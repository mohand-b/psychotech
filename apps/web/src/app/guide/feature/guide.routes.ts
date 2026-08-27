import { Route } from '@angular/router';

export const guideRoutes: Route[] = [
  {
    path: 'guide',
    data: { hideMobileNav: true, hideMobileHeader: true },
    loadComponent: () =>
      import('./guide-hub/guide-hub').then((m) => m.GuideHub),
  },
  {
    path: 'guide/logique',
    data: { hideMobileNav: true, hideMobileHeader: true },
    loadComponent: () =>
      import('./guide-logic-rules/guide-logic-rules').then(
        (m) => m.GuideLogicRules,
      ),
  },
];
