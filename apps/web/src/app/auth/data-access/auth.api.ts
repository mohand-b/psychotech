import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  LoginDto,
  RegisterDto,
  UserProfileDto,
} from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  login(credentials: LoginDto): Observable<UserProfileDto> {
    return this.http.post<UserProfileDto>(`${this.baseUrl}/auth/login`, credentials);
  }

  register(payload: RegisterDto): Observable<UserProfileDto> {
    return this.http.post<UserProfileDto>(`${this.baseUrl}/auth/register`, payload);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/logout`, {});
  }

  refresh(): Observable<UserProfileDto> {
    return this.http.post<UserProfileDto>(`${this.baseUrl}/auth/refresh`, {});
  }

  currentUser(): Observable<UserProfileDto> {
    return this.http.get<UserProfileDto>(`${this.baseUrl}/me`);
  }
}
