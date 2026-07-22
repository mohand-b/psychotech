import {
  ApplicationConfig,
  ErrorHandler,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  inject,
} from '@angular/core';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import {
  NavigationError,
  provideRouter,
  withNavigationErrorHandler,
} from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';
import { AuthFacade } from './auth/data-access/auth.facade';
import { credentialsInterceptor } from './core/http/credentials.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { StaleChunkErrorHandler } from './core/stale-chunk-error.handler';
import { isStaleChunkError, reloadOnceForStaleChunk } from './core/stale-chunk';
import { appRoutes } from './app.routes';

function reloadOnStaleChunk(event: NavigationError): void {
  if (isStaleChunkError(event.error)) {
    reloadOnceForStaleChunk(event.url);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: StaleChunkErrorHandler },
    provideRouter(appRoutes, withNavigationErrorHandler(reloadOnStaleChunk)),
    provideHttpClient(
      withFetch(),
      withInterceptors([credentialsInterceptor, errorInterceptor]),
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      }),
    ),
    provideAppInitializer(() => {
      const authFacade = inject(AuthFacade);
      return firstValueFrom(
        authFacade.loadCurrentUser().pipe(catchError(() => of(null))),
      );
    }),
  ],
};
