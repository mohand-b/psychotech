import { XSRF_COOKIE_NAME, XSRF_HEADER_NAME } from '@psychotech/shared';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const CSRF_TOKEN_COOKIE = XSRF_COOKIE_NAME;
export const GOOGLE_STATE_COOKIE = 'google_oauth_state';
export const GOOGLE_STATE_COOKIE_PATH = '/api/auth/google';
export const CSRF_TOKEN_HEADER = XSRF_HEADER_NAME;
