import { Route } from '@angular/router';
import { essentialTierGuard } from '../data-access/essential-tier.guard';

export const energyRoutes: Route[] = [
  {
    path: 'recharge',
    canActivate: [essentialTierGuard],
    loadComponent: () => import('./recharge/recharge').then((m) => m.Recharge),
  },
];
