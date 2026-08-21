import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import { authConfig } from '../config/auth.config';
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  GOOGLE_STATE_COOKIE,
  GOOGLE_STATE_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE,
} from './auth.constants';
import { GOOGLE_STATE_TTL_SECONDS } from './google/google-oauth.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthCookieService {
  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  setAuthCookies(response: Response, tokens: AuthTokens): void {
    response.cookie(
      ACCESS_TOKEN_COOKIE,
      tokens.accessToken,
      this.cookieOptions(this.config.accessTtlSeconds, true),
    );
    response.cookie(
      REFRESH_TOKEN_COOKIE,
      tokens.refreshToken,
      this.cookieOptions(this.config.refreshTtlSeconds, true),
    );
  }

  setCsrfCookie(response: Response, csrfToken: string): void {
    response.cookie(
      CSRF_TOKEN_COOKIE,
      csrfToken,
      this.cookieOptions(this.config.refreshTtlSeconds, false),
    );
  }

  setGoogleStateCookie(response: Response, stateToken: string): void {
    response.cookie(GOOGLE_STATE_COOKIE, stateToken, {
      ...this.googleStateOptions(),
      maxAge: GOOGLE_STATE_TTL_SECONDS * 1000,
    });
  }

  clearGoogleStateCookie(response: Response): void {
    response.clearCookie(GOOGLE_STATE_COOKIE, this.googleStateOptions());
  }

  clearAuthCookies(response: Response): void {
    const base = this.baseOptions();
    response.clearCookie(ACCESS_TOKEN_COOKIE, { ...base, httpOnly: true });
    response.clearCookie(REFRESH_TOKEN_COOKIE, { ...base, httpOnly: true });
    response.clearCookie(CSRF_TOKEN_COOKIE, { ...base, httpOnly: false });
  }

  private cookieOptions(maxAgeSeconds: number, httpOnly: boolean): CookieOptions {
    return { ...this.baseOptions(), httpOnly, maxAge: maxAgeSeconds * 1000 };
  }

  private baseOptions(): CookieOptions {
    return {
      secure: this.config.cookie.secure,
      sameSite: this.config.cookie.sameSite,
      domain: this.config.cookie.domain,
      path: '/',
    };
  }

  private googleStateOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.cookie.secure,
      sameSite: 'lax',
      domain: this.config.cookie.domain,
      path: GOOGLE_STATE_COOKIE_PATH,
    };
  }
}
