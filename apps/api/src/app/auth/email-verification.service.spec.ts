import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { EmailVerification, User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRepository } from './auth.repository';
import { EmailVerificationRepository } from './email-verification.repository';
import { EmailVerificationService } from './email-verification.service';

const TOKEN = 'a'.repeat(64);

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function buildRecord(
  overrides: Partial<EmailVerification> = {},
): EmailVerification {
  return {
    id: 'verification-1',
    userId: 'user-1',
    tokenHash: tokenHash(TOKEN),
    expiresAt: new Date(Date.now() + 3_600_000),
    usedAt: null,
    sentCount: 1,
    lastSentAt: new Date(Date.now() - 120_000),
    createdAt: new Date(Date.now() - 120_000),
    ...overrides,
  };
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Martin',
    passwordHash: 'hash',
    refreshTokenHash: null,
    locale: 'fr',
    timezone: 'Europe/Paris',
    currentSector: 'RAILWAY',
    stripeCustomerId: null,
    termsVersion: null,
    termsAcceptedAt: null,
    emailVerifiedAt: null,
    createdAt: new Date('2026-08-06T10:00:00Z'),
    updatedAt: new Date('2026-08-06T10:00:00Z'),
    ...overrides,
  };
}

const repository = {
  replaceToken: vi.fn(),
  findByTokenHash: vi.fn(),
  findByUserId: vi.fn(),
  consumeAndGrant: vi.fn(),
};

const authRepository = { findById: vi.fn() };

const mailer = { send: vi.fn() };

const configService = {
  getOrThrow: () => ({
    from: 'PsychoTech <no-reply@psychotech.app>',
    appBaseUrl: 'http://localhost:4200',
  }),
} as unknown as ConfigService;

const service = new EmailVerificationService(
  repository as unknown as EmailVerificationRepository,
  authRepository as unknown as AuthRepository,
  mailer,
  configService,
);

beforeEach(() => {
  vi.clearAllMocks();
  mailer.send.mockResolvedValue(undefined);
  repository.replaceToken.mockResolvedValue(buildRecord());
});

describe('EmailVerificationService.verify', () => {
  it('grants the signup energy exactly once on a fresh token', async () => {
    repository.findByTokenHash.mockResolvedValue(buildRecord());
    repository.consumeAndGrant.mockResolvedValue('VERIFIED_WITH_GRANT');

    const result = await service.verify(TOKEN);

    expect(result).toEqual({ outcome: 'VERIFIED', grantedEnergy: 5 });
    expect(repository.consumeAndGrant).toHaveBeenCalledWith(
      'verification-1',
      'user-1',
      5,
      expect.any(Date),
    );
  });

  it('never grants twice on a double click', async () => {
    repository.findByTokenHash
      .mockResolvedValueOnce(buildRecord())
      .mockResolvedValueOnce(buildRecord({ usedAt: new Date() }));
    repository.consumeAndGrant.mockResolvedValue('VERIFIED_WITH_GRANT');

    const first = await service.verify(TOKEN);
    const second = await service.verify(TOKEN);

    expect(first.outcome).toBe('VERIFIED');
    expect(second).toEqual({ outcome: 'ALREADY_VERIFIED', grantedEnergy: 0 });
    expect(repository.consumeAndGrant).toHaveBeenCalledTimes(1);
  });

  it('resolves a concurrent race to a single grant', async () => {
    repository.findByTokenHash.mockResolvedValue(buildRecord());
    repository.consumeAndGrant
      .mockResolvedValueOnce('VERIFIED_WITH_GRANT')
      .mockResolvedValueOnce('ALREADY_USED');

    const [first, second] = await Promise.all([
      service.verify(TOKEN),
      service.verify(TOKEN),
    ]);

    const outcomes = [first.outcome, second.outcome].sort();
    expect(outcomes).toEqual(['ALREADY_VERIFIED', 'VERIFIED']);
    expect(first.grantedEnergy + second.grantedEnergy).toBe(5);
  });

  it('rejects an expired link without touching the account', async () => {
    repository.findByTokenHash.mockResolvedValue(
      buildRecord({ expiresAt: new Date(Date.now() - 1000) }),
    );

    const result = await service.verify(TOKEN);

    expect(result).toEqual({ outcome: 'EXPIRED', grantedEnergy: 0 });
    expect(repository.consumeAndGrant).not.toHaveBeenCalled();
  });

  it('rejects an unknown token', async () => {
    repository.findByTokenHash.mockResolvedValue(null);

    const result = await service.verify(TOKEN);

    expect(result).toEqual({ outcome: 'INVALID', grantedEnergy: 0 });
  });
});

describe('EmailVerificationService.resend', () => {
  it('sends a fresh link to an unverified account outside the cooldown', async () => {
    authRepository.findById.mockResolvedValue(buildUser());
    repository.findByUserId.mockResolvedValue(buildRecord());

    const result = await service.resend('user-1');

    expect(result).toEqual({ sent: true, retryAfterSeconds: null });
    expect(repository.replaceToken).toHaveBeenCalledTimes(1);
    expect(mailer.send).toHaveBeenCalledTimes(1);
  });

  it('refuses a resend inside the per-account cooldown', async () => {
    authRepository.findById.mockResolvedValue(buildUser());
    repository.findByUserId.mockResolvedValue(
      buildRecord({ lastSentAt: new Date(Date.now() - 10_000) }),
    );

    const result = await service.resend('user-1');

    expect(result.sent).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('refuses a resend past the daily allowance', async () => {
    authRepository.findById.mockResolvedValue(buildUser());
    repository.findByUserId.mockResolvedValue(
      buildRecord({ sentCount: 5, lastSentAt: new Date(Date.now() - 120_000) }),
    );

    const result = await service.resend('user-1');

    expect(result.sent).toBe(false);
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('does nothing for an already verified account', async () => {
    authRepository.findById.mockResolvedValue(
      buildUser({ emailVerifiedAt: new Date() }),
    );

    const result = await service.resend('user-1');

    expect(result).toEqual({ sent: false, retryAfterSeconds: null });
    expect(mailer.send).not.toHaveBeenCalled();
  });
});
