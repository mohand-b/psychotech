import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { BadgeEvent, LEGAL_TERMS_VERSION, Sector } from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadgesService } from '../badges/badges.service';
import { UsersRepository } from '../users/users.repository';
import { AuthRepository, GoogleSignInOutcome } from './auth.repository';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { GoogleOAuthError } from './google/google-oauth.error';
import { PasswordHasher } from './password.service';
import { RefreshSessionService } from './refresh-session.service';
import { TokenService } from './token.service';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Martin',
    passwordHash: 'stored-password-hash',
    refreshTokenHash: null,
    locale: 'fr',
    timezone: 'Europe/Paris',
    currentSector: 'RAILWAY',
    stripeCustomerId: null,
    termsVersion: null,
    termsAcceptedAt: null,
    emailVerifiedAt: null,
    createdAt: new Date('2026-06-13T10:00:00Z'),
    updatedAt: new Date('2026-06-13T10:00:00Z'),
    ...overrides,
  };
}

const repository = {
  findByEmailInsensitive: vi.fn(),
  findById: vi.fn(),
  createAccount: vi.fn(),
  googleSignIn: vi.fn(),
  updateRefreshTokenHash: vi.fn(),
  updatePasswordHash: vi.fn(),
  markLogin: vi.fn(),
  deleteUser: vi.fn(),
};

const passwordHasher = { hash: vi.fn(), verify: vi.fn() };
const tokenService = {
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
};
const refreshSessions = {
  open: vi.fn(),
  renew: vi.fn(),
  close: vi.fn(),
  closeAll: vi.fn(),
};
const usersRepository = { isSectorActive: vi.fn() };

const emailVerification = { sendInitialVerification: vi.fn() };

const badgesService = { evaluateWithin: vi.fn() };

const mailer = { send: vi.fn() };

const configService = {
  getOrThrow: () => ({
    from: 'PsychoTech <no-reply@psychotech.app>',
    appBaseUrl: 'http://localhost:4200',
  }),
} as unknown as ConfigService;

const service = new AuthService(
  repository as unknown as AuthRepository,
  passwordHasher as unknown as PasswordHasher,
  tokenService as unknown as TokenService,
  refreshSessions as unknown as RefreshSessionService,
  usersRepository as unknown as UsersRepository,
  emailVerification as unknown as EmailVerificationService,
  badgesService as unknown as BadgesService,
  mailer,
  configService,
);

beforeEach(() => {
  vi.clearAllMocks();
  tokenService.signAccessToken.mockResolvedValue('access-token');
  refreshSessions.open.mockResolvedValue('refresh-token');
  repository.updateRefreshTokenHash.mockResolvedValue(buildUser());
  usersRepository.isSectorActive.mockResolvedValue(true);
});

describe('AuthService.register', () => {
  it('creates the account with a hashed password and stores the hashed refresh token', async () => {
    repository.findByEmailInsensitive.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValueOnce('hashed-password');
    repository.createAccount.mockResolvedValue(buildUser());

    const result = await service.register({
      email: 'alice@example.com',
      password: 'super-secret',
      firstName: 'Alice',
      lastName: 'Martin',
      currentSector: Sector.RAILWAY,
    });

    expect(usersRepository.isSectorActive).toHaveBeenCalledWith(Sector.RAILWAY);
    expect(repository.createAccount).toHaveBeenCalledWith({
      email: 'alice@example.com',
      passwordHash: 'hashed-password',
      firstName: 'Alice',
      lastName: 'Martin',
      timezone: 'Europe/Paris',
      locale: undefined,
      currentSector: Sector.RAILWAY,
      termsVersion: LEGAL_TERMS_VERSION,
      termsAcceptedAt: expect.any(Date),
    });
    expect(refreshSessions.open).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'alice@example.com',
    });
    expect(emailVerification.sendInitialVerification).toHaveBeenCalledTimes(1);
    expect(result.tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(result.user.email).toBe('alice@example.com');
    expect(result.csrfToken).toHaveLength(64);
  });

  it('rejects a duplicate email', async () => {
    repository.findByEmailInsensitive.mockResolvedValue(buildUser());

    await expect(
      service.register({
        email: 'alice@example.com',
        password: 'super-secret',
        firstName: 'Alice',
        lastName: 'Martin',
        currentSector: Sector.RAILWAY,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.createAccount).not.toHaveBeenCalled();
  });

  it('normalizes the email before the uniqueness check and the account creation', async () => {
    repository.findByEmailInsensitive.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValueOnce('hashed-password');
    repository.createAccount.mockResolvedValue(buildUser());

    await service.register({
      email: '  Alice@Example.COM ',
      password: 'super-secret',
      firstName: 'Alice',
      lastName: 'Martin',
      currentSector: Sector.RAILWAY,
    });

    expect(repository.findByEmailInsensitive).toHaveBeenCalledWith(
      'alice@example.com',
    );
    expect(repository.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alice@example.com' }),
    );
  });

  it('rejects registration on an inactive sector', async () => {
    repository.findByEmailInsensitive.mockResolvedValue(null);
    usersRepository.isSectorActive.mockResolvedValue(false);

    await expect(
      service.register({
        email: 'alice@example.com',
        password: 'super-secret',
        firstName: 'Alice',
        lastName: 'Martin',
        currentSector: Sector.AVIATION,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createAccount).not.toHaveBeenCalled();
  });
});

describe('AuthService.login', () => {
  it('rejects an invalid password', async () => {
    repository.findByEmailInsensitive.mockResolvedValue(buildUser());
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      service.login({ email: 'alice@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokenService.signAccessToken).not.toHaveBeenCalled();
  });

  it('issues a session for valid credentials', async () => {
    repository.findByEmailInsensitive.mockResolvedValue(buildUser());
    passwordHasher.verify.mockResolvedValue(true);

    const result = await service.login({
      email: 'alice@example.com',
      password: 'super-secret',
    });

    expect(result.tokens.accessToken).toBe('access-token');
    expect(refreshSessions.open).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'alice@example.com',
    });
  });
});

describe('AuthService.changePassword', () => {
  it('rejects an invalid current password without touching the stored hashes', async () => {
    repository.findById.mockResolvedValue(buildUser());
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'wrong',
        newPassword: 'NewSecret1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updatePasswordHash).not.toHaveBeenCalled();
    expect(refreshSessions.closeAll).not.toHaveBeenCalled();
  });

  it('hashes the new password, signs every device out and opens a fresh session for this one', async () => {
    repository.findById.mockResolvedValue(
      buildUser({ refreshTokenHash: 'other-device-refresh-hash' }),
    );
    passwordHasher.verify.mockResolvedValue(true);
    passwordHasher.hash.mockResolvedValueOnce('new-password-hash');

    const result = await service.changePassword('user-1', {
      currentPassword: 'super-secret',
      newPassword: 'NewSecret1',
    });

    expect(passwordHasher.verify).toHaveBeenCalledWith(
      'stored-password-hash',
      'super-secret',
    );
    expect(repository.updatePasswordHash).toHaveBeenCalledWith(
      'user-1',
      'new-password-hash',
    );
    expect(refreshSessions.closeAll).toHaveBeenCalledWith('user-1');
    expect(repository.updateRefreshTokenHash).toHaveBeenCalledWith(
      'user-1',
      null,
    );
    expect(refreshSessions.open).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'alice@example.com',
    });
    expect(result.tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });
});

describe('AuthService.refresh', () => {
  const DEVICE_PAYLOAD = {
    sub: 'user-1',
    email: 'alice@example.com',
    sid: 'device-session-1',
    iat: 1_789_000_000,
  };

  it('renews the device session and returns the refresh token it designates', async () => {
    tokenService.verifyRefreshToken.mockResolvedValue(DEVICE_PAYLOAD);
    repository.findById.mockResolvedValue(buildUser());
    refreshSessions.renew.mockResolvedValue('renewed-refresh-token');

    const result = await service.refresh('presented-refresh-token');

    expect(refreshSessions.renew).toHaveBeenCalledWith(
      DEVICE_PAYLOAD,
      'presented-refresh-token',
    );
    expect(result.tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'renewed-refresh-token',
    });
  });

  it('rejects a token its device session no longer accepts', async () => {
    tokenService.verifyRefreshToken.mockResolvedValue(DEVICE_PAYLOAD);
    repository.findById.mockResolvedValue(buildUser());
    refreshSessions.renew.mockResolvedValue(null);

    await expect(service.refresh('dead-refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  describe('tokens issued before device sessions existed', () => {
    const LEGACY_PAYLOAD = { sub: 'user-1', email: 'alice@example.com' };

    it('adopts a token matching the stored hash into a device session without killing it', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue(LEGACY_PAYLOAD);
      repository.findById.mockResolvedValue(
        buildUser({ refreshTokenHash: 'legacy-refresh-hash' }),
      );
      passwordHasher.verify.mockResolvedValue(true);

      const result = await service.refresh('legacy-refresh-token');

      expect(passwordHasher.verify).toHaveBeenCalledWith(
        'legacy-refresh-hash',
        'legacy-refresh-token',
      );
      expect(refreshSessions.open).toHaveBeenCalledWith(LEGACY_PAYLOAD);
      expect(repository.updateRefreshTokenHash).not.toHaveBeenCalled();
      expect(result.tokens.refreshToken).toBe('refresh-token');
    });

    it('rejects a token that does not match the stored hash', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue(LEGACY_PAYLOAD);
      repository.findById.mockResolvedValue(
        buildUser({ refreshTokenHash: 'legacy-refresh-hash' }),
      );
      passwordHasher.verify.mockResolvedValue(false);

      await expect(
        service.refresh('old-refresh-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(refreshSessions.open).not.toHaveBeenCalled();
    });

    it('rejects any token once the stored hash has been revoked', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue(LEGACY_PAYLOAD);
      repository.findById.mockResolvedValue(buildUser());

      await expect(
        service.refresh('legacy-refresh-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('csrf token continuity', () => {
    const CURRENT_CSRF_TOKEN = 'ab'.repeat(32);

    beforeEach(() => {
      tokenService.verifyRefreshToken.mockResolvedValue(DEVICE_PAYLOAD);
      repository.findById.mockResolvedValue(buildUser());
      refreshSessions.renew.mockResolvedValue('renewed-refresh-token');
    });

    it('keeps the csrf token the client already holds so an in-flight request replays with a valid header', async () => {
      const result = await service.refresh(
        'presented-refresh-token',
        CURRENT_CSRF_TOKEN,
      );

      expect(result.csrfToken).toBe(CURRENT_CSRF_TOKEN);
    });

    it('issues a fresh csrf token when none is presented', async () => {
      const result = await service.refresh('presented-refresh-token');

      expect(result.csrfToken).toMatch(/^[0-9a-f]{64}$/);
    });

    it.each([
      '<script>alert(1)</script>',
      'AB'.repeat(32),
      'ab'.repeat(32).slice(1),
      'ab'.repeat(32) + 'a',
      'ab'.repeat(32) + '\n',
    ])('never echoes the malformed csrf token %j', async (malformed) => {
      const result = await service.refresh('presented-refresh-token', malformed);

      expect(result.csrfToken).not.toBe(malformed);
      expect(result.csrfToken).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  it('rejects a missing refresh token', async () => {
    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('AuthService.logout', () => {
  it('closes only the device session of the presented token', async () => {
    tokenService.verifyRefreshToken.mockResolvedValue({
      sub: 'user-1',
      email: 'alice@example.com',
      sid: 'device-session-1',
    });

    await service.logout('presented-refresh-token');

    expect(refreshSessions.close).toHaveBeenCalledWith(
      'device-session-1',
      'user-1',
    );
    expect(refreshSessions.closeAll).not.toHaveBeenCalled();
  });

  it('does nothing without a verifiable token', async () => {
    tokenService.verifyRefreshToken.mockRejectedValue(new Error('invalid'));

    await service.logout('garbage');
    await service.logout(undefined);

    expect(refreshSessions.close).not.toHaveBeenCalled();
    expect(repository.updateRefreshTokenHash).not.toHaveBeenCalled();
  });
});

function buildGoogleClaims(
  overrides: Partial<{
    providerAccountId: string;
    email: string;
    emailVerified: boolean;
    givenName?: string;
    familyName?: string;
  }> = {},
) {
  return {
    providerAccountId: 'google-sub-1',
    email: 'Alice@Example.com',
    emailVerified: true,
    givenName: 'Alice',
    familyName: 'Martin',
    ...overrides,
  };
}

describe('AuthService.googleSignIn', () => {
  it('creates a verified account with the normalized email and skips the verification email', async () => {
    const outcome: GoogleSignInOutcome = {
      kind: 'CREATED',
      user: buildUser({ emailVerifiedAt: new Date() }),
      verifiedNow: true,
    };
    repository.googleSignIn.mockResolvedValue(outcome);

    const result = await service.googleSignIn(buildGoogleClaims(), {});

    expect(repository.googleSignIn).toHaveBeenCalledWith(
      expect.objectContaining({
        providerAccountId: 'google-sub-1',
        email: 'alice@example.com',
        emailVerified: true,
        firstName: 'Alice',
        lastName: 'Martin',
        currentSector: Sector.RAILWAY,
        termsVersion: LEGAL_TERMS_VERSION,
      }),
      expect.any(Function),
    );
    expect(emailVerification.sendInitialVerification).not.toHaveBeenCalled();
    expect(repository.markLogin).toHaveBeenCalledWith('user-1', expect.any(Date));
    expect(result.tokens.accessToken).toBe('access-token');
  });

  it('falls back to the standard verification flow when Google does not vouch for the address', async () => {
    const outcome: GoogleSignInOutcome = {
      kind: 'CREATED',
      user: buildUser(),
      verifiedNow: false,
    };
    repository.googleSignIn.mockResolvedValue(outcome);

    await service.googleSignIn(
      buildGoogleClaims({ emailVerified: false }),
      {},
    );

    expect(emailVerification.sendInitialVerification).toHaveBeenCalledTimes(1);
  });

  it('signs into the linked account without creating anything', async () => {
    const outcome: GoogleSignInOutcome = {
      kind: 'LINKED',
      user: buildUser({ emailVerifiedAt: new Date() }),
      verifiedNow: false,
    };
    repository.googleSignIn.mockResolvedValue(outcome);

    const result = await service.googleSignIn(buildGoogleClaims(), {});

    expect(repository.createAccount).not.toHaveBeenCalled();
    expect(emailVerification.sendInitialVerification).not.toHaveBeenCalled();
    expect(result.user.id).toBe('user-1');
  });

  it('relays the account-verified badge event through the transactional callback', async () => {
    repository.googleSignIn.mockImplementation(
      async (
        _data: unknown,
        onVerified: (tx: unknown, userId: string) => Promise<void>,
      ) => {
        await onVerified('tx-client', 'user-1');
        return {
          kind: 'LINKED',
          user: buildUser({ emailVerifiedAt: new Date() }),
          verifiedNow: true,
        };
      },
    );

    await service.googleSignIn(buildGoogleClaims(), {});

    expect(badgesService.evaluateWithin).toHaveBeenCalledWith(
      'tx-client',
      'user-1',
      BadgeEvent.ACCOUNT_VERIFIED,
      null,
    );
  });

  it('refuses an address already tied to another Google identity', async () => {
    const outcome: GoogleSignInOutcome = { kind: 'CONFLICT_OTHER_GOOGLE' };
    repository.googleSignIn.mockResolvedValue(outcome);

    await expect(
      service.googleSignIn(buildGoogleClaims(), {}),
    ).rejects.toMatchObject({ code: 'GOOGLE_CONFLICT' });
    expect(repository.updateRefreshTokenHash).not.toHaveBeenCalled();
  });

  it('refuses to link an existing account when the Google email is unverified', async () => {
    const outcome: GoogleSignInOutcome = { kind: 'UNVERIFIED_LINK_REFUSED' };
    repository.googleSignIn.mockResolvedValue(outcome);

    const attempt = service.googleSignIn(
      buildGoogleClaims({ emailVerified: false }),
      {},
    );

    await expect(attempt).rejects.toBeInstanceOf(GoogleOAuthError);
    await expect(
      service.googleSignIn(buildGoogleClaims({ emailVerified: false }), {}),
    ).rejects.toMatchObject({ code: 'GOOGLE_UNVERIFIED' });
  });
});
