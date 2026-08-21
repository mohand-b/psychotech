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
  usersRepository as unknown as UsersRepository,
  emailVerification as unknown as EmailVerificationService,
  badgesService as unknown as BadgesService,
  mailer,
  configService,
);

beforeEach(() => {
  vi.clearAllMocks();
  tokenService.signAccessToken.mockResolvedValue('access-token');
  tokenService.signRefreshToken.mockResolvedValue('refresh-token');
  repository.updateRefreshTokenHash.mockResolvedValue(buildUser());
  usersRepository.isSectorActive.mockResolvedValue(true);
});

describe('AuthService.register', () => {
  it('creates the account with a hashed password and stores the hashed refresh token', async () => {
    repository.findByEmailInsensitive.mockResolvedValue(null);
    passwordHasher.hash
      .mockResolvedValueOnce('hashed-password')
      .mockResolvedValueOnce('hashed-refresh-token');
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
    expect(repository.updateRefreshTokenHash).toHaveBeenCalledWith(
      'user-1',
      'hashed-refresh-token',
    );
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
    passwordHasher.hash
      .mockResolvedValueOnce('hashed-password')
      .mockResolvedValueOnce('hashed-refresh-token');
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
    passwordHasher.hash.mockResolvedValue('hashed-refresh-token');

    const result = await service.login({
      email: 'alice@example.com',
      password: 'super-secret',
    });

    expect(result.tokens.accessToken).toBe('access-token');
    expect(repository.updateRefreshTokenHash).toHaveBeenCalledWith(
      'user-1',
      'hashed-refresh-token',
    );
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
    expect(repository.updateRefreshTokenHash).not.toHaveBeenCalled();
  });

  it('hashes the new password and revokes the other refresh tokens by rotation', async () => {
    repository.findById.mockResolvedValue(
      buildUser({ refreshTokenHash: 'other-device-refresh-hash' }),
    );
    passwordHasher.verify.mockResolvedValue(true);
    passwordHasher.hash
      .mockResolvedValueOnce('new-password-hash')
      .mockResolvedValueOnce('rotated-refresh-hash');

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
    expect(repository.updateRefreshTokenHash).toHaveBeenCalledWith(
      'user-1',
      'rotated-refresh-hash',
    );
    expect(result.tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });
});

describe('AuthService.refresh', () => {
  it('rotates the tokens and overwrites the stored refresh hash', async () => {
    tokenService.verifyRefreshToken.mockResolvedValue({
      sub: 'user-1',
      email: 'alice@example.com',
    });
    repository.findById.mockResolvedValue(
      buildUser({ refreshTokenHash: 'previous-refresh-hash' }),
    );
    passwordHasher.verify.mockResolvedValue(true);
    tokenService.signRefreshToken.mockResolvedValue('rotated-refresh-token');
    passwordHasher.hash.mockResolvedValue('rotated-refresh-hash');

    const result = await service.refresh('presented-refresh-token');

    expect(passwordHasher.verify).toHaveBeenCalledWith(
      'previous-refresh-hash',
      'presented-refresh-token',
    );
    expect(repository.updateRefreshTokenHash).toHaveBeenCalledWith(
      'user-1',
      'rotated-refresh-hash',
    );
    expect(result.tokens.refreshToken).toBe('rotated-refresh-token');
  });

  it('rejects a refresh token that no longer matches the stored hash', async () => {
    tokenService.verifyRefreshToken.mockResolvedValue({
      sub: 'user-1',
      email: 'alice@example.com',
    });
    repository.findById.mockResolvedValue(
      buildUser({ refreshTokenHash: 'rotated-refresh-hash' }),
    );
    passwordHasher.verify.mockResolvedValue(false);

    await expect(service.refresh('old-refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(repository.updateRefreshTokenHash).not.toHaveBeenCalled();
  });

  it('rejects a missing refresh token', async () => {
    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
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
  beforeEach(() => {
    passwordHasher.hash.mockResolvedValue('hashed-refresh-token');
  });

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
