import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  ChangePasswordDto,
  DeleteAccountDto,
  EmailChangeRequestResponseDto,
  LoginDto,
  RegisterDto,
  RequestEmailChangeDto,
  ResendVerificationResponseDto,
  UpdateUserProfileDto,
  UserProfileDto,
  VerifyEmailChangeResponseDto,
  VerifyEmailRequestDto,
  VerifyEmailResponseDto,
} from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  login(credentials: LoginDto): Observable<UserProfileDto> {
    return this.http.post<UserProfileDto>(
      `${this.baseUrl}/auth/login`,
      credentials,
    );
  }

  register(payload: RegisterDto): Observable<UserProfileDto> {
    return this.http.post<UserProfileDto>(
      `${this.baseUrl}/auth/register`,
      payload,
    );
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

  updateProfile(payload: UpdateUserProfileDto): Observable<UserProfileDto> {
    return this.http.patch<UserProfileDto>(`${this.baseUrl}/me`, payload);
  }

  changePassword(payload: ChangePasswordDto): Observable<UserProfileDto> {
    return this.http.post<UserProfileDto>(
      `${this.baseUrl}/auth/password`,
      payload,
    );
  }

  verifyEmail(payload: VerifyEmailRequestDto): Observable<VerifyEmailResponseDto> {
    return this.http.post<VerifyEmailResponseDto>(
      `${this.baseUrl}/auth/email/verify`,
      payload,
    );
  }

  resendVerification(): Observable<ResendVerificationResponseDto> {
    return this.http.post<ResendVerificationResponseDto>(
      `${this.baseUrl}/auth/email/resend`,
      {},
    );
  }

  requestEmailChange(
    payload: RequestEmailChangeDto,
  ): Observable<EmailChangeRequestResponseDto> {
    return this.http.post<EmailChangeRequestResponseDto>(
      `${this.baseUrl}/auth/email/change`,
      payload,
    );
  }

  verifyEmailChange(token: string): Observable<VerifyEmailChangeResponseDto> {
    return this.http.post<VerifyEmailChangeResponseDto>(
      `${this.baseUrl}/auth/email/change/verify`,
      { token },
    );
  }

  deleteAccount(payload: DeleteAccountDto): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/auth/account/delete`,
      payload,
    );
  }
}
