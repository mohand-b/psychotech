import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { PASSWORD_RESET_TTL_MINUTES } from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRepository } from './auth.repository';
import { PasswordResetRepository } from './password-reset.repository';
import { PasswordResetService } from './password-reset.service';
import { PasswordHasher } from './password.service';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Martin',
    passwordHash: 'stored-password-hash',
    refreshTokenHash: 'a-live-session',
    locale: 'fr',
    timezone: 'Europe/Paris',
    currentSector: 'RAILWAY',
    emailVerifiedAt: new Date('2026-08-01T00:00:00Z'),
    createdAt: new Date('2026-06-13T10:00:00Z'),
    updatedAt: new Date('2026-06-13T10:00:00Z'),
    ...overrides,
  } as User;
}

function buildRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reset-1',
    userId: 'user-1',
    tokenHash: 'unused',
    expiresAt: new Date(Date.now() + 30 * 60_000),
    usedAt: null,
    sentCount: 1,
    lastSentAt: new Date(Date.now() - 10 * 60_000),
    createdAt: new Date(),
    ...overrides,
  };
}

const repository = {
  replaceRequest: vi.fn(),
  findByUserId: vi.fn(),
  findByTokenHash: vi.fn(),
  discardForUser: vi.fn(),
  consumeAndSetPassword: vi.fn(),
};

const authRepository = {
  findByEmailInsensitive: vi.fn(),
  findById: vi.fn(),
};

const passwordHasher = { hash: vi.fn(), verify: vi.fn() };
const mailer = { send: vi.fn() };

const configService = {
  getOrThrow: () => ({
    from: 'PsychoTech <no-reply@psychotech.app>',
    appBaseUrl: 'http://localhost:4200',
  }),
} as unknown as ConfigService;

const service = new PasswordResetService(
  repository as unknown as PasswordResetRepository,
  authRepository as unknown as AuthRepository,
  passwordHasher as unknown as PasswordHasher,
  mailer,
  configService,
);

function hashOf(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

beforeEach(() => {
  vi.clearAllMocks();
  mailer.send.mockResolvedValue(undefined);
  repository.findByUserId.mockResolvedValue(null);
  repository.replaceRequest.mockResolvedValue(buildRecord());
  passwordHasher.hash.mockResolvedValue('new-password-hash');
});

describe('PasswordResetService.request', () => {
  it('answers the very same payload for an unknown address as for a known one', async () => {
    authRepository.findByEmailInsensitive.mockResolvedValue(null);
    const unknown = service.request('ghost@example.com');
    authRepository.findByEmailInsensitive.mockResolvedValue(buildUser());
    const known = service.request('alice@example.com');

    expect(unknown).toEqual({ accepted: true });
    expect(known).toEqual({ accepted: true });
  });

  it('answers without waiting for any database or mail work, so timing cannot reveal an account', () => {
    authRepository.findByEmailInsensitive.mockImplementation(
      () => new Promise(() => undefined),
    );

    const answer = service.request('alice@example.com');

    expect(answer).toEqual({ accepted: true });
    expect(mailer.send).not.toHaveBeenCalled();
  });
});

describe('PasswordResetService.deliverResetLink', () => {
  it('sends nothing when no account carries the address', async () => {
    authRepository.findByEmailInsensitive.mockResolvedValue(null);

    await service.deliverResetLink('ghost@example.com');

    expect(repository.replaceRequest).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('stores only the hash of the token and mails the clear one', async () => {
    authRepository.findByEmailInsensitive.mockResolvedValue(buildUser());

    await service.deliverResetLink('alice@example.com');

    const [, storedHash, expiresAt] = repository.replaceRequest.mock.calls[0];
    const [message] = mailer.send.mock.calls[0];
    const token = new URL(
      message.html.match(/href="([^"]*nouveau-mot-de-passe[^"]*)"/)[1],
    ).searchParams.get('token');

    expect(token).toBeTruthy();
    expect(storedHash).toBe(hashOf(token));
    expect(storedHash).not.toBe(token);
    expect(message.html).not.toContain(storedHash);
    const ttlMinutes = Math.round(
      (expiresAt.getTime() - Date.now()) / 60_000,
    );
    expect(ttlMinutes).toBe(PASSWORD_RESET_TTL_MINUTES);
  });

  it('replaces any previous request so a single token stays active', async () => {
    authRepository.findByEmailInsensitive.mockResolvedValue(buildUser());
    repository.findByUserId.mockResolvedValue(
      buildRecord({ lastSentAt: new Date(Date.now() - 10 * 60_000) }),
    );

    await service.deliverResetLink('alice@example.com');

    expect(repository.replaceRequest).toHaveBeenCalledTimes(1);
    expect(repository.replaceRequest.mock.calls[0][0]).toBe('user-1');
  });

  it('stays silent while the resend throttle of the verification flow is still holding', async () => {
    authRepository.findByEmailInsensitive.mockResolvedValue(buildUser());
    repository.findByUserId.mockResolvedValue(
      buildRecord({ lastSentAt: new Date() }),
    );

    await service.deliverResetLink('alice@example.com');

    expect(repository.replaceRequest).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('invites a google-only account to define a password rather than reset one', async () => {
    authRepository.findByEmailInsensitive.mockResolvedValue(
      buildUser({ passwordHash: null }),
    );

    await service.deliverResetLink('alice@example.com');

    const [message] = mailer.send.mock.calls[0];
    expect(message.subject).toContain('Définissez');
    expect(message.html).toContain('Définir mon mot de passe');
    expect(message.html).not.toContain('réinitialiser le mot de passe');
  });
});

describe('PasswordResetService.check', () => {
  it('reports the address and the first-password case for a live token', async () => {
    repository.findByTokenHash.mockResolvedValue(buildRecord());
    authRepository.findById.mockResolvedValue(buildUser({ passwordHash: null }));

    const check = await service.check('a-token');

    expect(check).toEqual({
      outcome: 'VALID',
      email: 'alice@example.com',
      definesFirstPassword: true,
    });
  });

  it('never leaks the address on an unusable token', async () => {
    repository.findByTokenHash.mockResolvedValue(null);
    expect(await service.check('nope')).toEqual({
      outcome: 'INVALID',
      email: null,
      definesFirstPassword: false,
    });

    repository.findByTokenHash.mockResolvedValue(
      buildRecord({ usedAt: new Date() }),
    );
    expect(await service.check('used')).toMatchObject({
      outcome: 'ALREADY_USED',
      email: null,
    });

    repository.findByTokenHash.mockResolvedValue(
      buildRecord({ expiresAt: new Date(Date.now() - 1_000) }),
    );
    expect(await service.check('old')).toMatchObject({
      outcome: 'EXPIRED',
      email: null,
    });
  });
});

describe('PasswordResetService.reset', () => {
  it('hashes the new password, consumes the token and notifies the account', async () => {
    repository.findByTokenHash.mockResolvedValue(buildRecord());
    authRepository.findById.mockResolvedValue(buildUser());
    repository.consumeAndSetPassword.mockResolvedValue('RESET');

    const result = await service.reset('a-token', 'NouveauSecret1');

    expect(result).toEqual({ outcome: 'RESET' });
    expect(passwordHasher.hash).toHaveBeenCalledWith('NouveauSecret1');
    expect(repository.consumeAndSetPassword).toHaveBeenCalledWith(
      'reset-1',
      'user-1',
      'new-password-hash',
      expect.any(Date),
    );
    const [notice] = mailer.send.mock.calls[0];
    expect(notice.to).toBe('alice@example.com');
    expect(notice.subject).toBe('Votre mot de passe a été modifié');
    expect(notice.text).toContain('appareils ont été déconnectés');
  });

  it('tells a google-only account that its password is now defined', async () => {
    repository.findByTokenHash.mockResolvedValue(buildRecord());
    authRepository.findById.mockResolvedValue(buildUser({ passwordHash: null }));
    repository.consumeAndSetPassword.mockResolvedValue('RESET');

    await service.reset('a-token', 'NouveauSecret1');

    const [notice] = mailer.send.mock.calls[0];
    expect(notice.subject).toBe('Votre mot de passe a été défini');
    expect(notice.text).toContain('continuer avec Google');
  });

  it('refuses a token that a concurrent request already consumed', async () => {
    repository.findByTokenHash.mockResolvedValue(buildRecord());
    authRepository.findById.mockResolvedValue(buildUser());
    repository.consumeAndSetPassword.mockResolvedValue('ALREADY_USED');

    expect(await service.reset('a-token', 'NouveauSecret1')).toEqual({
      outcome: 'ALREADY_USED',
    });
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('refuses an already used token without touching the password', async () => {
    repository.findByTokenHash.mockResolvedValue(
      buildRecord({ usedAt: new Date() }),
    );

    expect(await service.reset('used', 'NouveauSecret1')).toEqual({
      outcome: 'ALREADY_USED',
    });
    expect(repository.consumeAndSetPassword).not.toHaveBeenCalled();
  });

  it('refuses an expired token without touching the password', async () => {
    repository.findByTokenHash.mockResolvedValue(
      buildRecord({ expiresAt: new Date(Date.now() - 1_000) }),
    );

    expect(await service.reset('old', 'NouveauSecret1')).toEqual({
      outcome: 'EXPIRED',
    });
    expect(repository.consumeAndSetPassword).not.toHaveBeenCalled();
  });

  it('refuses an unknown token', async () => {
    repository.findByTokenHash.mockResolvedValue(null);

    expect(await service.reset('nope', 'NouveauSecret1')).toEqual({
      outcome: 'INVALID',
    });
    expect(repository.consumeAndSetPassword).not.toHaveBeenCalled();
  });
});
