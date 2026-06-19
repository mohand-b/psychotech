import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { AuthFacade } from './auth.facade';

export const authGuard: CanMatchFn = (): boolean | UrlTree => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);
  return authFacade.isAuthenticated() ? true : router.parseUrl('/login');
};

export const guestGuard: CanMatchFn = (): boolean | UrlTree => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);
  return authFacade.isAuthenticated() ? router.parseUrl('/dashboard') : true;
};
