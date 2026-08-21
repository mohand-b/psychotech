export const SSO_ERROR_QUERY_PARAM = 'ssoError';

export const SSO_ERROR_CODES = [
  'GOOGLE_DENIED',
  'GOOGLE_INTERRUPTED',
  'GOOGLE_CONFLICT',
  'GOOGLE_UNVERIFIED',
  'GOOGLE_UNAVAILABLE',
  'GOOGLE_FAILED',
] as const;

export type SsoErrorCode = (typeof SSO_ERROR_CODES)[number];

export function isSsoErrorCode(value: string): value is SsoErrorCode {
  return (SSO_ERROR_CODES as readonly string[]).includes(value);
}

export const SSO_ORIGINS = ['login', 'register'] as const;

export type SsoOrigin = (typeof SSO_ORIGINS)[number];

export const SSO_RETURN_URL_QUERY_PARAM = 'returnUrl';
export const SSO_FROM_QUERY_PARAM = 'from';
export const SSO_SECTOR_QUERY_PARAM = 'sector';

export function isSafeReturnUrl(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
}
