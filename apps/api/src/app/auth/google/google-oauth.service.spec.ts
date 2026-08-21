import { createHash } from 'node:crypto';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Sector } from '@psychotech/shared';
import { jwtVerify } from 'jose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authConfig } from '../../config/auth.config';
import { googleConfig } from '../../config/google.config';
import { GoogleOAuthService, GoogleStatePayload } from './google-oauth.service';

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'jwks-key-set'),
  jwtVerify: vi.fn(),
}));

const config = {
  enabled: true,
  clientId: 'client-id',
  clientSecret: 'client-secret',
  redirectUri: 'http://localhost:3000/api/auth/google/callback',
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
  issuer: 'https://accounts.google.com',
  appBaseUrl: 'http://localhost:4200',
} as ConfigType<typeof googleConfig>;

const auth = {
  accessSecret: 'access-secret',
  refreshSecret: 'refresh-secret',
  accessTtlSeconds: 900,
  refreshTtlSeconds: 604800,
  cookie: { secure: false, sameSite: 'lax' as const, domain: undefined },
} as ConfigType<typeof authConfig>;

const jwtVerifyMock = vi.mocked(jwtVerify);

function buildService(): GoogleOAuthService {
  return new GoogleOAuthService(config, auth, new JwtService({}));
}

function buildState(
  overrides: Partial<GoogleStatePayload> = {},
): GoogleStatePayload {
  return {
    from: 'login',
    state: 'expected-state',
    nonce: 'expected-nonce',
    codeVerifier: 'expected-verifier',
    ...overrides,
  };
}

function stubTokenEndpoint(idToken: string | undefined): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => (idToken === undefined ? {} : { id_token: idToken }),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GoogleOAuthService.createStart', () => {
  it('builds the authorization url with PKCE S256, state and nonce bound to the signed cookie payload', async () => {
    const service = buildService();

    const start = await service.createStart({
      from: 'register',
      returnUrl: '/entrainements',
      sector: Sector.RAILWAY,
    });

    const url = new URL(start.url);
    expect(`${url.origin}${url.pathname}`).toBe(config.authorizationUrl);
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('prompt')).toBe('select_account');

    const payload = await service.readState(start.stateToken);
    expect(payload.from).toBe('register');
    expect(payload.returnUrl).toBe('/entrainements');
    expect(payload.sector).toBe(Sector.RAILWAY);
    expect(url.searchParams.get('state')).toBe(payload.state);
    expect(url.searchParams.get('nonce')).toBe(payload.nonce);
    const expectedChallenge = createHash('sha256')
      .update(payload.codeVerifier)
      .digest('base64url');
    expect(url.searchParams.get('code_challenge')).toBe(expectedChallenge);
  });
});

describe('GoogleOAuthService.readState', () => {
  it('rejects a missing state cookie as an interrupted flow', async () => {
    await expect(buildService().readState(undefined)).rejects.toMatchObject({
      code: 'GOOGLE_INTERRUPTED',
    });
  });

  it('rejects a tampered state cookie as an interrupted flow', async () => {
    await expect(
      buildService().readState('not-a-valid-jwt'),
    ).rejects.toMatchObject({ code: 'GOOGLE_INTERRUPTED' });
  });
});

describe('GoogleOAuthService.exchange', () => {
  it('maps an access_denied answer to GOOGLE_DENIED', async () => {
    await expect(
      buildService().exchange({ error: 'access_denied' }, buildState()),
    ).rejects.toMatchObject({ code: 'GOOGLE_DENIED' });
  });

  it('maps any other Google error to GOOGLE_FAILED', async () => {
    await expect(
      buildService().exchange({ error: 'server_error' }, buildState()),
    ).rejects.toMatchObject({ code: 'GOOGLE_FAILED' });
  });

  it('rejects a state mismatch as an interrupted flow', async () => {
    await expect(
      buildService().exchange(
        { code: 'auth-code', state: 'forged-state' },
        buildState(),
      ),
    ).rejects.toMatchObject({ code: 'GOOGLE_INTERRUPTED' });
  });

  it('exchanges the code with the verifier and extracts the identity claims', async () => {
    const fetchMock = stubTokenEndpoint('the-id-token');
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: 'google-sub-1',
        email: 'alice@example.com',
        email_verified: true,
        given_name: 'Alice',
        family_name: 'Martin',
        nonce: 'expected-nonce',
      },
      protectedHeader: { alg: 'RS256' },
      key: {},
    } as unknown as Awaited<ReturnType<typeof jwtVerify>>);

    const claims = await buildService().exchange(
      { code: 'auth-code', state: 'expected-state' },
      buildState(),
    );

    expect(claims).toEqual({
      providerAccountId: 'google-sub-1',
      email: 'alice@example.com',
      emailVerified: true,
      givenName: 'Alice',
      familyName: 'Martin',
    });
    const [tokenUrl, request] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe(config.tokenUrl);
    const body = (request as { body: URLSearchParams }).body;
    expect(body.get('code')).toBe('auth-code');
    expect(body.get('code_verifier')).toBe('expected-verifier');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(jwtVerifyMock).toHaveBeenCalledWith(
      'the-id-token',
      'jwks-key-set',
      expect.objectContaining({
        issuer: config.issuer,
        audience: 'client-id',
      }),
    );
  });

  it('treats a non-boolean email_verified claim as unverified', async () => {
    stubTokenEndpoint('the-id-token');
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: 'google-sub-1',
        email: 'alice@example.com',
        email_verified: 'true',
        nonce: 'expected-nonce',
      },
      protectedHeader: { alg: 'RS256' },
      key: {},
    } as unknown as Awaited<ReturnType<typeof jwtVerify>>);

    const claims = await buildService().exchange(
      { code: 'auth-code', state: 'expected-state' },
      buildState(),
    );

    expect(claims.emailVerified).toBe(false);
  });

  it('rejects a nonce mismatch', async () => {
    stubTokenEndpoint('the-id-token');
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: 'google-sub-1',
        email: 'alice@example.com',
        nonce: 'forged-nonce',
      },
      protectedHeader: { alg: 'RS256' },
      key: {},
    } as unknown as Awaited<ReturnType<typeof jwtVerify>>);

    await expect(
      buildService().exchange(
        { code: 'auth-code', state: 'expected-state' },
        buildState(),
      ),
    ).rejects.toMatchObject({ code: 'GOOGLE_FAILED' });
  });

  it('rejects a refused code exchange', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'invalid_grant',
      }),
    );

    await expect(
      buildService().exchange(
        { code: 'auth-code', state: 'expected-state' },
        buildState(),
      ),
    ).rejects.toMatchObject({ code: 'GOOGLE_FAILED' });
  });

  it('rejects a token answer without id_token', async () => {
    stubTokenEndpoint(undefined);

    await expect(
      buildService().exchange(
        { code: 'auth-code', state: 'expected-state' },
        buildState(),
      ),
    ).rejects.toMatchObject({ code: 'GOOGLE_FAILED' });
  });
});

describe('GoogleOAuthService redirects', () => {
  it('lands on a safe relative returnUrl and falls back to the dashboard otherwise', () => {
    const service = buildService();
    expect(service.landingUrl('/entrainements')).toBe(
      'http://localhost:4200/entrainements',
    );
    expect(service.landingUrl(undefined)).toBe('http://localhost:4200/dashboard');
    expect(service.landingUrl('https://evil.example')).toBe(
      'http://localhost:4200/dashboard',
    );
    expect(service.landingUrl('//evil.example')).toBe(
      'http://localhost:4200/dashboard',
    );
  });

  it('points unverified accounts to the verification pending screen', () => {
    expect(buildService().verificationPendingUrl()).toBe(
      'http://localhost:4200/verification-email',
    );
  });

  it('sends errors back to the originating screen with the shared query param', () => {
    const service = buildService();
    expect(service.errorUrl('register', 'GOOGLE_DENIED')).toBe(
      'http://localhost:4200/register?ssoError=GOOGLE_DENIED',
    );
    expect(service.errorUrl('login', 'GOOGLE_CONFLICT')).toBe(
      'http://localhost:4200/login?ssoError=GOOGLE_CONFLICT',
    );
  });
});
