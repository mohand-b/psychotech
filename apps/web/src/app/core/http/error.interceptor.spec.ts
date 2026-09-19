import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { XSRF_COOKIE_NAME, XSRF_HEADER_NAME } from '@psychotech/shared';
import { Observable, defer, of, throwError } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { errorInterceptor } from './error.interceptor';

const RESULTS_URL = '/api/sessions/session-1/axes/MOTOR_SKILLS/results';
const STALE_TOKEN = 'stale-token';
const ROTATED_TOKEN = 'rotated-token';
const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

function writeXsrfCookie(token: string): void {
  document.cookie = `${XSRF_COOKIE_NAME}=${token}; path=/`;
}

function clearXsrfCookie(): void {
  document.cookie = `${XSRF_COOKIE_NAME}=; path=/; max-age=0`;
}

function setup(refresh: () => Observable<void>) {
  TestBed.resetTestingModule();
  const refreshSession = vi.fn(refresh);
  const clearSession = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(
        withInterceptors([errorInterceptor]),
        withXsrfConfiguration({
          cookieName: XSRF_COOKIE_NAME,
          headerName: XSRF_HEADER_NAME,
        }),
      ),
      provideHttpClientTesting(),
      { provide: AuthFacade, useValue: { refreshSession, clearSession } },
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    controller: TestBed.inject(HttpTestingController),
    refreshSession,
    clearSession,
  };
}

function rotatingRefresh(): Observable<void> {
  return defer(() => {
    writeXsrfCookie(ROTATED_TOKEN);
    return of(undefined);
  });
}

describe('errorInterceptor', () => {
  beforeEach(() => writeXsrfCookie(STALE_TOKEN));
  afterEach(() => clearXsrfCookie());

  it('replays a mutating request with the token issued by the refresh, never the stale one', () => {
    const { http, controller, refreshSession } = setup(rotatingRefresh);
    let received: unknown;
    http.post(RESULTS_URL, { courses: [] }).subscribe((body) => {
      received = body;
    });

    const expired = controller.expectOne(RESULTS_URL);
    expect(expired.request.headers.get(XSRF_HEADER_NAME)).toBe(STALE_TOKEN);
    expired.flush(null, UNAUTHORIZED);

    const replayed = controller.expectOne(RESULTS_URL);
    expect(replayed.request.headers.get(XSRF_HEADER_NAME)).toBe(ROTATED_TOKEN);
    expect(replayed.request.body).toEqual({ courses: [] });
    replayed.flush({ id: 'session-1' });

    expect(received).toEqual({ id: 'session-1' });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    controller.verify();
  });

  it('replays a read request without inventing an xsrf header', () => {
    const { http, controller } = setup(rotatingRefresh);
    http.get('/api/me').subscribe();

    controller.expectOne('/api/me').flush(null, UNAUTHORIZED);
    const replayed = controller.expectOne('/api/me');

    expect(replayed.request.headers.has(XSRF_HEADER_NAME)).toBe(false);
    replayed.flush({});
    controller.verify();
  });

  it('drops the stale header when the refresh leaves no xsrf cookie', () => {
    const { http, controller } = setup(() =>
      defer(() => {
        clearXsrfCookie();
        return of(undefined);
      }),
    );
    http.post(RESULTS_URL, {}).subscribe({ error: () => undefined });

    controller.expectOne(RESULTS_URL).flush(null, UNAUTHORIZED);
    const replayed = controller.expectOne(RESULTS_URL);

    expect(replayed.request.headers.has(XSRF_HEADER_NAME)).toBe(false);
    replayed.flush({});
    controller.verify();
  });

  it('replays only once and surfaces a second 401 to the caller', () => {
    const { http, controller, refreshSession } = setup(rotatingRefresh);
    let status: number | undefined;
    http.post(RESULTS_URL, {}).subscribe({
      error: (error: { status: number }) => {
        status = error.status;
      },
    });

    controller.expectOne(RESULTS_URL).flush(null, UNAUTHORIZED);
    controller.expectOne(RESULTS_URL).flush(null, UNAUTHORIZED);

    expect(status).toBe(401);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    controller.verify();
  });

  it.each([401, 403])(
    'clears the session and never replays when the refresh is refused with %i',
    (status) => {
      const { http, controller, clearSession } = setup(() =>
        throwError(
          () => new HttpErrorResponse({ status, statusText: 'Refused' }),
        ),
      );
      let failed = false;
      http.post(RESULTS_URL, {}).subscribe({
        error: () => {
          failed = true;
        },
      });

      controller.expectOne(RESULTS_URL).flush(null, UNAUTHORIZED);

      expect(failed).toBe(true);
      expect(clearSession).toHaveBeenCalledTimes(1);
      controller.verify();
    },
  );

  it('keeps the session when the refresh fails for a transient reason, so a retry can heal', () => {
    const { http, controller, clearSession } = setup(() =>
      throwError(
        () => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }),
      ),
    );
    let failed = false;
    http.post(RESULTS_URL, {}).subscribe({
      error: () => {
        failed = true;
      },
    });

    controller.expectOne(RESULTS_URL).flush(null, UNAUTHORIZED);

    expect(failed).toBe(true);
    expect(clearSession).not.toHaveBeenCalled();
    controller.verify();
  });

  it.each([
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/logout',
  ])('never refreshes when %s itself answers 401', (url) => {
    const { http, controller, refreshSession } = setup(rotatingRefresh);
    http.post(url, {}).subscribe({ error: () => undefined });

    controller.expectOne(url).flush(null, UNAUTHORIZED);

    expect(refreshSession).not.toHaveBeenCalled();
    controller.verify();
  });

  it('refreshes and replays an authenticated account operation after the token expired', () => {
    const { http, controller, refreshSession } = setup(rotatingRefresh);
    let succeeded = false;
    http.post('/api/auth/password', {}).subscribe(() => {
      succeeded = true;
    });

    controller.expectOne('/api/auth/password').flush(null, UNAUTHORIZED);
    const replayed = controller.expectOne('/api/auth/password');
    expect(replayed.request.headers.get(XSRF_HEADER_NAME)).toBe(ROTATED_TOKEN);
    replayed.flush({});

    expect(succeeded).toBe(true);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    controller.verify();
  });

  it('leaves non-401 failures untouched', () => {
    const { http, controller, refreshSession } = setup(rotatingRefresh);
    let status: number | undefined;
    http.post(RESULTS_URL, {}).subscribe({
      error: (error: { status: number }) => {
        status = error.status;
      },
    });

    controller
      .expectOne(RESULTS_URL)
      .flush(null, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
    expect(refreshSession).not.toHaveBeenCalled();
    controller.verify();
  });
});
