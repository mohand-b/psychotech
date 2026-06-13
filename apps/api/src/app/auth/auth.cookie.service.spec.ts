import { ConfigType } from '@nestjs/config';
import { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authConfig } from '../config/auth.config';
import { AuthCookieService } from './auth.cookie.service';

const config = {
  accessSecret: 'access',
  refreshSecret: 'refresh',
  accessTtlSeconds: 900,
  refreshTtlSeconds: 604800,
  cookie: { secure: false, sameSite: 'lax', domain: undefined },
  corsOrigin: 'http://localhost:4200',
};

const service = new AuthCookieService(
  config as unknown as ConfigType<typeof authConfig>,
);

const response = { cookie: vi.fn(), clearCookie: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthCookieService', () => {
  it('sets the access and refresh tokens as httpOnly cookies', () => {
    service.setAuthCookies(response as unknown as Response, {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    expect(response.cookie).toHaveBeenCalledWith(
      'access_token',
      'access-token',
      expect.objectContaining({ httpOnly: true, maxAge: 900000, sameSite: 'lax', secure: false, path: '/' }),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.objectContaining({ httpOnly: true, maxAge: 604800000 }),
    );
  });

  it('sets the csrf token as a readable cookie', () => {
    service.setCsrfCookie(response as unknown as Response, 'csrf-token');

    expect(response.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      'csrf-token',
      expect.objectContaining({ httpOnly: false }),
    );
  });

  it('clears every auth cookie on logout', () => {
    service.clearAuthCookies(response as unknown as Response);

    expect(response.clearCookie).toHaveBeenCalledWith(
      'access_token',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.objectContaining({ httpOnly: false }),
    );
  });
});
