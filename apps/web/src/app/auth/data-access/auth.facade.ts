import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, Signal, inject } from '@angular/core';
import {
  ChangePasswordDto,
  DeleteAccountDto,
  EmailChangeRequestResponseDto,
  LoginDto,
  PasswordResetTokenCheckDto,
  RegisterDto,
  RequestPasswordResetResponseDto,
  ResendVerificationResponseDto,
  ResetPasswordResponseDto,
  SSO_FROM_QUERY_PARAM,
  SSO_RETURN_URL_QUERY_PARAM,
  SSO_SECTOR_QUERY_PARAM,
  Sector,
  SsoOrigin,
  UpdateUserProfileDto,
  UserProfileDto,
  VerifyEmailChangeResponseDto,
  VerifyEmailResponseDto,
} from '@psychotech/shared';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import { AuthApi } from './auth.api';
import { AuthStore } from './auth.store';

export interface GoogleStartParams {
  from: SsoOrigin;
  returnUrl?: string;
  sector?: Sector;
}

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly api = inject(AuthApi);
  private readonly store = inject(AuthStore);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private refresh$: Observable<void> | null = null;

  readonly currentUser: Signal<UserProfileDto | null> = this.store.currentUser;
  readonly isAuthenticated: Signal<boolean> = this.store.isAuthenticated;
  readonly pending: Signal<boolean> = this.store.pending;

  login(credentials: LoginDto): Observable<UserProfileDto> {
    this.store.setPending(true);
    return this.api.login(credentials).pipe(
      tap((user) => this.store.setCurrentUser(user)),
      finalize(() => this.store.setPending(false)),
    );
  }

  register(payload: RegisterDto): Observable<UserProfileDto> {
    this.store.setPending(true);
    return this.api.register(payload).pipe(
      tap((user) => this.store.setCurrentUser(user)),
      finalize(() => this.store.setPending(false)),
    );
  }

  logout(): Observable<void> {
    return this.api
      .logout()
      .pipe(finalize(() => this.store.setCurrentUser(null)));
  }

  updateProfile(payload: UpdateUserProfileDto): Observable<UserProfileDto> {
    return this.api
      .updateProfile(payload)
      .pipe(tap((user) => this.store.setCurrentUser(user)));
  }

  changePassword(payload: ChangePasswordDto): Observable<UserProfileDto> {
    return this.api
      .changePassword(payload)
      .pipe(tap((user) => this.store.setCurrentUser(user)));
  }

  verifyEmail(token: string): Observable<VerifyEmailResponseDto> {
    return this.api.verifyEmail({ token });
  }

  resendVerification(): Observable<ResendVerificationResponseDto> {
    return this.api.resendVerification();
  }

  requestEmailChange(
    newEmail: string,
  ): Observable<EmailChangeRequestResponseDto> {
    return this.api.requestEmailChange({ newEmail }).pipe(
      tap((result) => {
        const current = this.store.currentUser();
        if (current && result.pendingEmail) {
          this.store.setCurrentUser({
            ...current,
            pendingEmail: result.pendingEmail,
          });
        }
      }),
    );
  }

  verifyEmailChange(token: string): Observable<VerifyEmailChangeResponseDto> {
    return this.api.verifyEmailChange(token);
  }

  requestPasswordReset(
    email: string,
  ): Observable<RequestPasswordResetResponseDto> {
    return this.api.requestPasswordReset({ email });
  }

  checkPasswordReset(token: string): Observable<PasswordResetTokenCheckDto> {
    return this.api.checkPasswordReset(token);
  }

  resetPassword(
    token: string,
    password: string,
  ): Observable<ResetPasswordResponseDto> {
    return this.api.resetPassword({ token, password });
  }

  deleteAccount(payload: DeleteAccountDto): Observable<void> {
    return this.api
      .deleteAccount(payload)
      .pipe(tap(() => this.store.setCurrentUser(null)));
  }

  loadCurrentUser(): Observable<UserProfileDto | null> {
    return this.api.currentUser().pipe(
      tap((user) => this.store.setCurrentUser(user)),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.store.setCurrentUser(null);
          return of(null);
        }
        return throwError(() => error);
      }),
    );
  }

  refreshSession(): Observable<void> {
    this.refresh$ ??= this.api.refresh().pipe(
      tap((user) => this.store.setCurrentUser(user)),
      map(() => undefined),
      finalize(() => {
        this.refresh$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refresh$;
  }

  clearSession(): void {
    this.store.setCurrentUser(null);
  }

  googleStartUrl(params: GoogleStartParams): string {
    const query = new URLSearchParams({ [SSO_FROM_QUERY_PARAM]: params.from });
    if (params.returnUrl !== undefined) {
      query.set(SSO_RETURN_URL_QUERY_PARAM, params.returnUrl);
    }
    if (params.sector !== undefined) {
      query.set(SSO_SECTOR_QUERY_PARAM, params.sector);
    }
    return `${this.apiBaseUrl}/auth/google/start?${query.toString()}`;
  }
}
