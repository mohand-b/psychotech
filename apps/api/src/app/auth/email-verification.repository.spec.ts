import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { EmailVerificationRepository } from './email-verification.repository';

function buildTx(consumedCount: number, markedCount: number) {
  return {
    emailVerification: {
      updateMany: vi.fn().mockResolvedValue({ count: consumedCount }),
    },
    user: { updateMany: vi.fn().mockResolvedValue({ count: markedCount }) },
    energyWallet: { upsert: vi.fn() },
    energyLedger: { create: vi.fn() },
  };
}

function buildPrisma(tx: ReturnType<typeof buildTx>) {
  return {
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
}

describe('EmailVerificationRepository.consumeAndVerify', () => {
  it('marks the token and verifies the user without any credit movement', async () => {
    const tx = buildTx(1, 1);
    const prisma = buildPrisma(tx);
    const repository = new EmailVerificationRepository(
      prisma as unknown as PrismaService,
    );
    const now = new Date('2026-08-06T10:00:00Z');

    const outcome = await repository.consumeAndVerify(
      'verification-1',
      'user-1',
      now,
    );

    expect(outcome).toBe('VERIFIED');
    expect(tx.emailVerification.updateMany).toHaveBeenCalledWith({
      where: { id: 'verification-1', usedAt: null },
      data: { usedAt: now },
    });
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', emailVerifiedAt: null },
      data: { emailVerifiedAt: now },
    });
    expect(tx.energyWallet.upsert).not.toHaveBeenCalled();
    expect(tx.energyLedger.create).not.toHaveBeenCalled();
  });

  it('stops when the token was already consumed', async () => {
    const tx = buildTx(0, 1);
    const prisma = buildPrisma(tx);
    const repository = new EmailVerificationRepository(
      prisma as unknown as PrismaService,
    );

    const outcome = await repository.consumeAndVerify(
      'verification-1',
      'user-1',
      new Date(),
    );

    expect(outcome).toBe('ALREADY_USED');
    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(tx.energyWallet.upsert).not.toHaveBeenCalled();
    expect(tx.energyLedger.create).not.toHaveBeenCalled();
  });

  it('reports an account already verified without any write on it', async () => {
    const tx = buildTx(1, 0);
    const prisma = buildPrisma(tx);
    const repository = new EmailVerificationRepository(
      prisma as unknown as PrismaService,
    );
    const onVerified = vi.fn();

    const outcome = await repository.consumeAndVerify(
      'verification-1',
      'user-1',
      new Date(),
      onVerified,
    );

    expect(outcome).toBe('ALREADY_VERIFIED');
    expect(onVerified).not.toHaveBeenCalled();
    expect(tx.energyWallet.upsert).not.toHaveBeenCalled();
    expect(tx.energyLedger.create).not.toHaveBeenCalled();
  });
});
