import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRepository } from './auth.repository';
import { EmailChangeRepository } from './email-change.repository';
import { EmailChangeService } from './email-change.service';

const USER = {
  id: 'user-1',
  email: 'ancienne@exemple.fr',
  firstName: 'Mohand',
  emailVerifiedAt: new Date('2026-04-14T10:00:00Z'),
};

const repository = {
  findByUserId: vi.fn(),
  findByTokenHash: vi.fn(),
  replaceRequest: vi.fn(),
  consumeAndSwap: vi.fn(),
};

const authRepository = {
  findById: vi.fn(),
  findByEmailInsensitive: vi.fn(),
  setPendingEmail: vi.fn(),
};

const mailer = { send: vi.fn() };

const configService = {
  getOrThrow: () => ({ from: 'test', appBaseUrl: 'http://localhost:4200' }),
} as unknown as ConfigService;

const service = new EmailChangeService(
  repository as unknown as EmailChangeRepository,
  authRepository as unknown as AuthRepository,
  mailer,
  configService,
);

beforeEach(() => {
  vi.clearAllMocks();
  authRepository.findById.mockResolvedValue(USER);
  authRepository.findByEmailInsensitive.mockResolvedValue(null);
  repository.findByUserId.mockResolvedValue(null);
  repository.replaceRequest.mockResolvedValue({});
  mailer.send.mockResolvedValue(undefined);
});

describe('EmailChangeService.request', () => {
  it('sends the signed link to the new address and a notice to the old one', async () => {
    const result = await service.request('user-1', ' Nouvelle@Exemple.fr ');

    expect(result).toEqual({
      sent: true,
      retryAfterSeconds: null,
      pendingEmail: 'nouvelle@exemple.fr',
    });
    expect(authRepository.setPendingEmail).toHaveBeenCalledWith(
      'user-1',
      'nouvelle@exemple.fr',
    );
    expect(mailer.send).toHaveBeenCalledTimes(2);
    const [verification, notice] = mailer.send.mock.calls.map(
      ([message]) => message,
    );
    expect(verification.to).toBe('nouvelle@exemple.fr');
    expect(verification.html).toContain('/verification-changement?token=');
    expect(notice.to).toBe('ancienne@exemple.fr');
    expect(notice.text).toContain('nouvelle@exemple.fr');
  });

  it('rejects an address already held by another account', async () => {
    authRepository.findByEmailInsensitive.mockResolvedValue({ id: 'user-2' });

    await expect(
      service.request('user-1', 'prise@exemple.fr'),
    ).rejects.toMatchObject({ message: 'EMAIL_TAKEN' });
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('rejects the current address as new address', async () => {
    await expect(
      service.request('user-1', 'Ancienne@exemple.fr'),
    ).rejects.toBeInstanceOf(Error);
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('rate limits the resend below the minimum interval', async () => {
    repository.findByUserId.mockResolvedValue({
      newEmail: 'nouvelle@exemple.fr',
      usedAt: null,
      lastSentAt: new Date(Date.now() - 10_000),
      sentCount: 1,
    });

    const result = await service.request('user-1', 'nouvelle@exemple.fr');

    expect(result.sent).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(mailer.send).not.toHaveBeenCalled();
  });
});

describe('EmailChangeService.verify', () => {
  const RECORD = {
    id: 'change-1',
    userId: 'user-1',
    newEmail: 'nouvelle@exemple.fr',
    usedAt: null,
    expiresAt: new Date(Date.now() + 3_600_000),
  };

  it('swaps the address on confirmation and notifies the old address', async () => {
    repository.findByTokenHash.mockResolvedValue(RECORD);
    repository.consumeAndSwap.mockResolvedValue('CHANGED');

    const result = await service.verify('token');

    expect(result).toEqual({ outcome: 'CHANGED', email: 'nouvelle@exemple.fr' });
    expect(repository.consumeAndSwap).toHaveBeenCalledWith(
      'change-1',
      'user-1',
      'nouvelle@exemple.fr',
      expect.any(Date),
    );
    const [notice] = mailer.send.mock.calls.map(([message]) => message);
    expect(notice.to).toBe('ancienne@exemple.fr');
  });

  it('treats a second click on the same link as already used', async () => {
    repository.findByTokenHash.mockResolvedValue(RECORD);
    repository.consumeAndSwap.mockResolvedValue('ALREADY_USED');

    const result = await service.verify('token');

    expect(result).toEqual({ outcome: 'ALREADY_USED', email: null });
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('rejects an expired link without touching the account', async () => {
    repository.findByTokenHash.mockResolvedValue({
      ...RECORD,
      expiresAt: new Date(Date.now() - 1_000),
    });

    const result = await service.verify('token');

    expect(result).toEqual({ outcome: 'EXPIRED', email: null });
    expect(repository.consumeAndSwap).not.toHaveBeenCalled();
  });

  it('never grants any credit: the swap path touches no wallet nor ledger', async () => {
    repository.findByTokenHash.mockResolvedValue(RECORD);
    repository.consumeAndSwap.mockResolvedValue('CHANGED');

    await service.verify('token');

    const calls = [
      ...Object.values(repository),
      ...Object.values(authRepository),
    ].flatMap((mock) => mock.mock.calls.flat());
    const serialized = JSON.stringify(calls);
    expect(serialized).not.toContain('wallet');
    expect(serialized).not.toContain('SIGNUP');
    expect(serialized).not.toContain('grant');
  });
});
