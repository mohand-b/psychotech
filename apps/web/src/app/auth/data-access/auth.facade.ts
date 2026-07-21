import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, Signal, inject } from '@angular/core';
import {
  LoginDto,
  RegisterDto,
  UserProfileDto,
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
import { AuthApi } from './auth.api';
import { AuthStore } from './auth.store';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly api = inject(AuthApi);
  private readonly store = inject(AuthStore);
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
}
