import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpStatusCode,
  HttpXsrfTokenExtractor,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { XSRF_HEADER_NAME } from '@psychotech/shared';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { API_BASE_URL } from './api-base-url.token';

const ALREADY_RETRIED = new HttpContextToken<boolean>(() => false);
const SESSION_ENDED_STATUSES: readonly number[] = [
  HttpStatusCode.Unauthorized,
  HttpStatusCode.Forbidden,
];
const REFRESH_EXEMPT_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
] as const;

function replayAfterRefresh(
  request: HttpRequest<unknown>,
  refreshedXsrfToken: string | null,
): HttpRequest<unknown> {
  const context = request.context.set(ALREADY_RETRIED, true);
  if (!request.headers.has(XSRF_HEADER_NAME)) {
    return request.clone({ context });
  }
  return request.clone({
    context,
    headers: refreshedXsrfToken
      ? request.headers.set(XSRF_HEADER_NAME, refreshedXsrfToken)
      : request.headers.delete(XSRF_HEADER_NAME),
  });
}

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const authFacade = inject(AuthFacade);
  const baseUrl = inject(API_BASE_URL);
  const xsrfTokenExtractor = inject(HttpXsrfTokenExtractor);
  return next(request).pipe(
    catchError((error: unknown) => {
      const isRefreshExempt = REFRESH_EXEMPT_PATHS.some(
        (path) => request.url === `${baseUrl}${path}`,
      );
      const alreadyRetried = request.context.get(ALREADY_RETRIED);
      if (
        error instanceof HttpErrorResponse &&
        error.status === HttpStatusCode.Unauthorized &&
        !isRefreshExempt &&
        !alreadyRetried
      ) {
        return authFacade.refreshSession().pipe(
          catchError((refreshError: unknown) => {
            if (
              refreshError instanceof HttpErrorResponse &&
              SESSION_ENDED_STATUSES.includes(refreshError.status)
            ) {
              authFacade.clearSession();
            }
            return throwError(() => refreshError);
          }),
          switchMap(() =>
            next(replayAfterRefresh(request, xsrfTokenExtractor.getToken())),
          ),
        );
      }
      return throwError(() => error);
    }),
  );
};
