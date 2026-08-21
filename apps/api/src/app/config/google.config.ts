import { registerAs } from '@nestjs/config';
import { readOptional } from './environment.readers';

const DEFAULT_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const DEFAULT_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DEFAULT_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const DEFAULT_ISSUER = 'https://accounts.google.com';
const DEFAULT_APP_BASE_URL = 'http://localhost:4200';

export interface GoogleOAuthConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  authorizationUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  issuer: string;
  appBaseUrl: string;
}

export const googleConfig = registerAs('google', (): GoogleOAuthConfig => {
  const clientId = readOptional('GOOGLE_CLIENT_ID');
  const clientSecret = readOptional('GOOGLE_CLIENT_SECRET');
  const redirectUri = readOptional('GOOGLE_REDIRECT_URI');
  return {
    enabled:
      clientId !== undefined &&
      clientSecret !== undefined &&
      redirectUri !== undefined,
    clientId,
    clientSecret,
    redirectUri,
    authorizationUrl:
      readOptional('GOOGLE_AUTHORIZATION_URL') ?? DEFAULT_AUTHORIZATION_URL,
    tokenUrl: readOptional('GOOGLE_TOKEN_URL') ?? DEFAULT_TOKEN_URL,
    jwksUrl: readOptional('GOOGLE_JWKS_URL') ?? DEFAULT_JWKS_URL,
    issuer: readOptional('GOOGLE_ISSUER') ?? DEFAULT_ISSUER,
    appBaseUrl:
      readOptional('APP_PUBLIC_URL') ??
      readOptional('CORS_ORIGIN') ??
      DEFAULT_APP_BASE_URL,
  };
});
