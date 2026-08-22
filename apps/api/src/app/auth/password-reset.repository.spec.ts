import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordResetRepository } from './password-reset.repository';

function buildTx() {
  return {
    passwordReset: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    user: { update: vi.fn().mockResolvedValue({}) },
  };
}

function repositoryWith(tx: ReturnType<typeof buildTx>) {
  const prisma = {
    $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  return new PasswordResetRepository(prisma as unknown as PrismaService);
}

describe('PasswordResetRepository.consumeAndSetPassword', () => {
  it('consumes the token and drops the stored refresh token so every device is signed out', async () => {
    const tx = buildTx();
    const now = new Date('2026-08-22T03:00:00Z');

    const outcome = await repositoryWith(tx).consumeAndSetPassword(
      'reset-1',
      'user-1',
      'new-password-hash',
      now,
    );

    expect(outcome).toBe('RESET');
    expect(tx.passwordReset.updateMany).toHaveBeenCalledWith({
      where: { id: 'reset-1', usedAt: null },
      data: { usedAt: now },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        passwordHash: 'new-password-hash',
        passwordChangedAt: now,
        refreshTokenHash: null,
      },
    });
  });

  it('leaves the password untouched when the token was consumed in the meantime', async () => {
    const tx = buildTx();
    tx.passwordReset.updateMany.mockResolvedValue({ count: 0 });

    const outcome = await repositoryWith(tx).consumeAndSetPassword(
      'reset-1',
      'user-1',
      'new-password-hash',
      new Date(),
    );

    expect(outcome).toBe('ALREADY_USED');
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
