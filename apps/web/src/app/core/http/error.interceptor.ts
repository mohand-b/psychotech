import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SUBSCRIPTION_REQUIRED_ERROR_CODE } from '@psychotech/shared';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { API_BASE_URL } from './api-base-url.token';

const ALREADY_RETRIED = new HttpContextToken<boolean>(() => false);

function isSubscriptionRequired(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 403 &&
    (error.error as { code?: string } | null)?.code ===
      SUBSCRIPTION_REQUIRED_ERROR_CODE
  );
}

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);
  const baseUrl = inject(API_BASE_URL);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (isSubscriptionRequired(error)) {
        router.navigate(['/abonnements']);
        return throwError(() => error);
      }
      const isAuthEndpoint = request.url.startsWith(`${baseUrl}/auth/`);
      const alreadyRetried = request.context.get(ALREADY_RETRIED);
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthEndpoint &&
        !alreadyRetried
      ) {
        return authFacade.refreshSession().pipe(
          catchError((refreshError: unknown) => {
            authFacade.clearSession();
            return throwError(() => refreshError);
          }),
          switchMap(() =>
            next(
              request.clone({
                context: request.context.set(ALREADY_RETRIED, true),
              }),
            ),
          ),
        );
      }
      return throwError(() => error);
    }),
  );
};
