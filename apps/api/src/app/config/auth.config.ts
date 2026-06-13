import { registerAs } from '@nestjs/config';

const DEFAULT_ACCESS_TTL_SECONDS = 900;
const DEFAULT_REFRESH_TTL_SECONDS = 604800;
const DEFAULT_COOKIE_SECURE = true;
const DEFAULT_COOKIE_SAME_SITE: CookieSameSite = 'lax';
const COOKIE_SAME_SITE_VALUES: readonly CookieSameSite[] = ['lax', 'strict', 'none'];

export type CookieSameSite = 'lax' | 'strict' | 'none';

export interface AuthConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  cookie: {
    secure: boolean;
    sameSite: CookieSameSite;
    domain?: string;
  };
  corsOrigin: string;
}

export const authConfig = registerAs(
  'auth',
  (): AuthConfig => ({
    accessSecret: readRequired('JWT_ACCESS_SECRET'),
    refreshSecret: readRequired('JWT_REFRESH_SECRET'),
    accessTtlSeconds: readNumber('JWT_ACCESS_TTL', DEFAULT_ACCESS_TTL_SECONDS),
    refreshTtlSeconds: readNumber('JWT_REFRESH_TTL', DEFAULT_REFRESH_TTL_SECONDS),
    cookie: {
      secure: readBoolean('COOKIE_SECURE', DEFAULT_COOKIE_SECURE),
      sameSite: readSameSite('COOKIE_SAMESITE', DEFAULT_COOKIE_SAME_SITE),
      domain: readOptional('COOKIE_DOMAIN'),
    },
    corsOrigin: readRequired('CORS_ORIGIN'),
  }),
);

function readRequired(key: string): string {
  const value = process.env[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function readOptional(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : undefined;
}

function readNumber(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${key} must be a positive integer`);
  }
  return parsed;
}

function readBoolean(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return fallback;
  }
  return value === 'true';
}

function readSameSite(key: string, fallback: CookieSameSite): CookieSameSite {
  const value = process.env[key];
  if (value === undefined) {
    return fallback;
  }
  if (!COOKIE_SAME_SITE_VALUES.includes(value as CookieSameSite)) {
    throw new Error(`Environment variable ${key} must be one of: ${COOKIE_SAME_SITE_VALUES.join(', ')}`);
  }
  return value as CookieSameSite;
}
