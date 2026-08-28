import {
  ApplicationConfig,
  ErrorHandler,
  PLATFORM_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  inject,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import {
  NavigationError,
  provideRouter,
  withInMemoryScrolling,
  withNavigationErrorHandler,
} from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { catchError, firstValueFrom, of } from 'rxjs';
import { AuthFacade } from './auth/data-access/auth.facade';
import { credentialsInterceptor } from './core/http/credentials.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { newBadgesInterceptor } from './core/http/new-badges.interceptor';
import { StaleChunkErrorHandler } from './core/stale-chunk-error.handler';
import { isStaleChunkError, reloadOnceForStaleChunk } from './core/stale-chunk';
import { appRoutes } from './app.routes';

function reloadOnStaleChunk(event: NavigationError): void {
  if (isStaleChunkError(event.error)) {
    reloadOnceForStaleChunk(event.url);
  }
}

const MOBILE_HEADER_ANCHOR_OFFSET = 76;
const DESKTOP_NAVBAR_ANCHOR_OFFSET = 88;
const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(withEventReplay()),
    { provide: ErrorHandler, useClass: StaleChunkErrorHandler },
    provideRouter(
      appRoutes,
      withNavigationErrorHandler(reloadOnStaleChunk),
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        credentialsInterceptor,
        errorInterceptor,
        newBadgesInterceptor,
      ]),
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      }),
    ),
    provideAppInitializer(() => {
      if (isPlatformServer(inject(PLATFORM_ID))) {
        return;
      }
      const scroller = inject(ViewportScroller);
      const mobileQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
      scroller.setOffset(() => [
        0,
        mobileQuery.matches
          ? MOBILE_HEADER_ANCHOR_OFFSET
          : DESKTOP_NAVBAR_ANCHOR_OFFSET,
      ]);
    }),
    provideAppInitializer(() => {
      if (isPlatformServer(inject(PLATFORM_ID))) {
        return undefined;
      }
      const authFacade = inject(AuthFacade);
      return firstValueFrom(
        authFacade.loadCurrentUser().pipe(catchError(() => of(null))),
      );
    }),
  ],
};
