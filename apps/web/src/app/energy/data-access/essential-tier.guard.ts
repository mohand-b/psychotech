import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SubscriptionTier } from '@psychotech/shared';
import { CoreFacade } from '../../core/data-access/core.facade';

export const essentialTierGuard: CanActivateFn = () => {
  const tier = inject(CoreFacade).tier();
  return tier === SubscriptionTier.ESSENTIAL
    ? true
    : inject(Router).createUrlTree(['/entrainements']);
};
