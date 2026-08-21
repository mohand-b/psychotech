import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { SSO_RETURN_URL_QUERY_PARAM, isSafeReturnUrl } from '@psychotech/shared';
import { AuthFacade } from './auth.facade';

export const authGuard: CanMatchFn = (): boolean | UrlTree => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);
  if (authFacade.isAuthenticated()) {
    return true;
  }
  const attemptedUrl =
    router.getCurrentNavigation()?.extractedUrl.toString() ?? null;
  if (
    attemptedUrl === null ||
    attemptedUrl === '/' ||
    !isSafeReturnUrl(attemptedUrl)
  ) {
    return router.parseUrl('/login');
  }
  return router.createUrlTree(['/login'], {
    queryParams: { [SSO_RETURN_URL_QUERY_PARAM]: attemptedUrl },
  });
};

export const guestGuard: CanMatchFn = (): boolean | UrlTree => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);
  return authFacade.isAuthenticated() ? router.parseUrl('/dashboard') : true;
};
