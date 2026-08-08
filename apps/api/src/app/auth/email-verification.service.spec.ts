import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { EmailVerification, User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadgesService } from '../badges/badges.service';
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
  consumeAndVerify: vi.fn(),
};

const authRepository = { findById: vi.fn() };

const badgesService = { evaluateWithin: vi.fn() };

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
  badgesService as unknown as BadgesService,
  mailer,
  configService,
);

beforeEach(() => {
  vi.clearAllMocks();
  mailer.send.mockResolvedValue(undefined);
  repository.replaceToken.mockResolvedValue(buildRecord());
});

describe('EmailVerificationService.verify', () => {
  it('verifies a fresh token and returns the confirmed address without any credit', async () => {
    repository.findByTokenHash.mockResolvedValue(buildRecord());
    repository.consumeAndVerify.mockResolvedValue('VERIFIED');
    authRepository.findById.mockResolvedValue(buildUser());

    const result = await service.verify(TOKEN);

    expect(result).toEqual({ outcome: 'VERIFIED', email: 'alice@example.com' });
    expect(repository.consumeAndVerify).toHaveBeenCalledWith(
      'verification-1',
      'user-1',
      expect.any(Date),
      expect.any(Function),
    );
  });

  it('reports an already used token on a double click', async () => {
    repository.findByTokenHash
      .mockResolvedValueOnce(buildRecord())
      .mockResolvedValueOnce(buildRecord({ usedAt: new Date() }));
    repository.consumeAndVerify.mockResolvedValue('VERIFIED');
    authRepository.findById.mockResolvedValue(buildUser());

    const first = await service.verify(TOKEN);
    const second = await service.verify(TOKEN);

    expect(first.outcome).toBe('VERIFIED');
    expect(second).toEqual({ outcome: 'ALREADY_VERIFIED', email: null });
    expect(repository.consumeAndVerify).toHaveBeenCalledTimes(1);
  });

  it('resolves a concurrent race to a single verification', async () => {
    repository.findByTokenHash.mockResolvedValue(buildRecord());
    repository.consumeAndVerify
      .mockResolvedValueOnce('VERIFIED')
      .mockResolvedValueOnce('ALREADY_USED');
    authRepository.findById.mockResolvedValue(buildUser());

    const [first, second] = await Promise.all([
      service.verify(TOKEN),
      service.verify(TOKEN),
    ]);

    const outcomes = [first.outcome, second.outcome].sort();
    expect(outcomes).toEqual(['ALREADY_VERIFIED', 'VERIFIED']);
  });

  it('rejects an expired link without touching the account', async () => {
    repository.findByTokenHash.mockResolvedValue(
      buildRecord({ expiresAt: new Date(Date.now() - 1000) }),
    );

    const result = await service.verify(TOKEN);

    expect(result).toEqual({ outcome: 'EXPIRED', email: null });
    expect(repository.consumeAndVerify).not.toHaveBeenCalled();
  });

  it('rejects an unknown token', async () => {
    repository.findByTokenHash.mockResolvedValue(null);

    const result = await service.verify(TOKEN);

    expect(result).toEqual({ outcome: 'INVALID', email: null });
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
