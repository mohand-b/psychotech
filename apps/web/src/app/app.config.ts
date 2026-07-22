import {
  ApplicationConfig,
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
import { appRoutes } from './app.routes';

const STALE_CHUNK_RELOAD_KEY = 'psychotech.stale-chunk-reload-at';
const STALE_CHUNK_RELOAD_COOLDOWN_MS = 30_000;

function isStaleChunkError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    /dynamically imported module|import\(\)|Loading chunk/i.test(error.message)
  );
}

function reloadOnStaleChunk(event: NavigationError): void {
  if (!isStaleChunkError(event.error)) {
    return;
  }
  const lastReloadAt = Number(
    window.sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY) ?? 0,
  );
  if (Date.now() - lastReloadAt < STALE_CHUNK_RELOAD_COOLDOWN_MS) {
    return;
  }
  window.sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, String(Date.now()));
  window.location.assign(event.url);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
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
