import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  SSO_ERROR_QUERY_PARAM,
  Sector,
  SsoOrigin,
  isSafeReturnUrl,
} from '@psychotech/shared';
import { JWTPayload, createRemoteJWKSet, jwtVerify } from 'jose';
import { authConfig } from '../../config/auth.config';
import { googleConfig } from '../../config/google.config';
import { GoogleOAuthError } from './google-oauth.error';

export const GOOGLE_STATE_TTL_SECONDS = 600;
const STATE_TOKEN_AUDIENCE = 'google-oauth-state';
const STATE_BYTES = 32;
const NONCE_BYTES = 32;
const CODE_VERIFIER_BYTES = 32;
const OAUTH_SCOPE = 'openid email profile';
const ACCESS_DENIED_ERROR = 'access_denied';
const CLOCK_TOLERANCE_SECONDS = 5;

export interface GoogleFlowContext {
  from: SsoOrigin;
  returnUrl?: string;
  sector?: Sector;
}

export interface GoogleStatePayload extends GoogleFlowContext {
  state: string;
  nonce: string;
  codeVerifier: string;
}

export interface GoogleStart {
  url: string;
  stateToken: string;
}

export interface GoogleCallbackQuery {
  code?: string;
  state?: string;
  error?: string;
}

export interface GoogleIdentityClaims {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
}

interface TokenEndpointResponse {
  id_token?: string;
}

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(
    @Inject(googleConfig.KEY)
    private readonly config: ConfigType<typeof googleConfig>,
    @Inject(authConfig.KEY)
    private readonly auth: ConfigType<typeof authConfig>,
    private readonly jwtService: JwtService,
  ) {}

  get enabled(): boolean {
    return this.config.enabled;
  }

  async createStart(context: GoogleFlowContext): Promise<GoogleStart> {
    const state = randomBytes(STATE_BYTES).toString('hex');
    const nonce = randomBytes(NONCE_BYTES).toString('hex');
    const codeVerifier = randomBytes(CODE_VERIFIER_BYTES).toString('base64url');
    const payload: GoogleStatePayload = { ...context, state, nonce, codeVerifier };
    const stateToken = await this.jwtService.signAsync(payload, {
      secret: this.auth.accessSecret,
      audience: STATE_TOKEN_AUDIENCE,
      expiresIn: GOOGLE_STATE_TTL_SECONDS,
    });
    const url = new URL(this.config.authorizationUrl);
    url.searchParams.set('client_id', this.requireClientId());
    url.searchParams.set('redirect_uri', this.requireRedirectUri());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', OAUTH_SCOPE);
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('code_challenge', this.codeChallenge(codeVerifier));
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('prompt', 'select_account');
    return { url: url.toString(), stateToken };
  }

  async readState(stateToken: string | undefined): Promise<GoogleStatePayload> {
    if (!stateToken) {
      throw new GoogleOAuthError('GOOGLE_INTERRUPTED', 'Missing state cookie');
    }
    try {
      return await this.jwtService.verifyAsync<GoogleStatePayload>(stateToken, {
        secret: this.auth.accessSecret,
        audience: STATE_TOKEN_AUDIENCE,
      });
    } catch {
      throw new GoogleOAuthError('GOOGLE_INTERRUPTED', 'Invalid state cookie');
    }
  }

  async exchange(
    query: GoogleCallbackQuery,
    state: GoogleStatePayload,
  ): Promise<GoogleIdentityClaims> {
    if (query.error !== undefined) {
      throw new GoogleOAuthError(
        query.error === ACCESS_DENIED_ERROR ? 'GOOGLE_DENIED' : 'GOOGLE_FAILED',
        `Google returned error "${query.error}"`,
      );
    }
    if (!query.code || !query.state || query.state !== state.state) {
      throw new GoogleOAuthError('GOOGLE_INTERRUPTED', 'State mismatch');
    }
    const idToken = await this.fetchIdToken(query.code, state.codeVerifier);
    const claims = await this.verifyIdToken(idToken, state.nonce);
    return claims;
  }

  landingUrl(returnUrl: string | undefined): string {
    const path =
      returnUrl !== undefined && isSafeReturnUrl(returnUrl)
        ? returnUrl
        : '/dashboard';
    return `${this.config.appBaseUrl}${path}`;
  }

  verificationPendingUrl(): string {
    return `${this.config.appBaseUrl}/verification-email`;
  }

  errorUrl(from: SsoOrigin, code: GoogleOAuthError['code']): string {
    const screen = from === 'register' ? '/register' : '/login';
    const url = new URL(`${this.config.appBaseUrl}${screen}`);
    url.searchParams.set(SSO_ERROR_QUERY_PARAM, code);
    return url.toString();
  }

  private async fetchIdToken(code: string, codeVerifier: string): Promise<string> {
    const body = new URLSearchParams({
      code,
      client_id: this.requireClientId(),
      client_secret: this.config.clientSecret ?? '',
      redirect_uri: this.requireRedirectUri(),
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    });
    let response: globalThis.Response;
    try {
      response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    } catch (error) {
      this.logger.error('Google token endpoint unreachable', String(error));
      throw new GoogleOAuthError('GOOGLE_FAILED', 'Token endpoint unreachable');
    }
    if (!response.ok) {
      this.logger.error(
        `Google token endpoint answered ${response.status}: ${await response.text()}`,
      );
      throw new GoogleOAuthError('GOOGLE_FAILED', 'Code exchange refused');
    }
    const payload = (await response.json()) as TokenEndpointResponse;
    if (!payload.id_token) {
      throw new GoogleOAuthError('GOOGLE_FAILED', 'Missing id_token');
    }
    return payload.id_token;
  }

  private async verifyIdToken(
    idToken: string,
    expectedNonce: string,
  ): Promise<GoogleIdentityClaims> {
    let payload: JWTPayload;
    try {
      const verified = await jwtVerify(idToken, this.jwksKeySet(), {
        issuer: this.config.issuer,
        audience: this.requireClientId(),
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
      });
      payload = verified.payload;
    } catch (error) {
      this.logger.error('Google id_token verification failed', String(error));
      throw new GoogleOAuthError('GOOGLE_FAILED', 'Invalid id_token');
    }
    if (payload['nonce'] !== expectedNonce) {
      throw new GoogleOAuthError('GOOGLE_FAILED', 'Nonce mismatch');
    }
    const email = payload['email'];
    if (typeof payload.sub !== 'string' || typeof email !== 'string') {
      throw new GoogleOAuthError('GOOGLE_FAILED', 'Missing identity claims');
    }
    return {
      providerAccountId: payload.sub,
      email,
      emailVerified: payload['email_verified'] === true,
      givenName: this.optionalString(payload['given_name']),
      familyName: this.optionalString(payload['family_name']),
    };
  }

  private jwksKeySet(): ReturnType<typeof createRemoteJWKSet> {
    this.jwks ??= createRemoteJWKSet(new URL(this.config.jwksUrl));
    return this.jwks;
  }

  private codeChallenge(codeVerifier: string): string {
    return createHash('sha256').update(codeVerifier).digest('base64url');
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private requireClientId(): string {
    if (!this.config.clientId) {
      throw new GoogleOAuthError('GOOGLE_UNAVAILABLE', 'Missing client id');
    }
    return this.config.clientId;
  }

  private requireRedirectUri(): string {
    if (!this.config.redirectUri) {
      throw new GoogleOAuthError('GOOGLE_UNAVAILABLE', 'Missing redirect uri');
    }
    return this.config.redirectUri;
  }
}
