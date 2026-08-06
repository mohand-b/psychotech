import { EnergyLedgerReason } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { EmailVerificationRepository } from './email-verification.repository';

function buildTx(consumedCount: number, markedCount: number) {
  return {
    emailVerification: {
      updateMany: vi.fn().mockResolvedValue({ count: consumedCount }),
    },
    user: { updateMany: vi.fn().mockResolvedValue({ count: markedCount }) },
    energyWallet: {
      upsert: vi.fn().mockResolvedValue({ userId: 'user-1', balance: 5 }),
    },
    energyLedger: { create: vi.fn().mockResolvedValue({}) },
  };
}

function buildPrisma(tx: ReturnType<typeof buildTx>) {
  return {
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
}

describe('EmailVerificationRepository.consumeAndGrant', () => {
  it('marks the token, verifies the user and credits the grant in one transaction', async () => {
    const tx = buildTx(1, 1);
    const prisma = buildPrisma(tx);
    const repository = new EmailVerificationRepository(
      prisma as unknown as PrismaService,
    );
    const now = new Date('2026-08-06T10:00:00Z');

    const outcome = await repository.consumeAndGrant(
      'verification-1',
      'user-1',
      5,
      now,
    );

    expect(outcome).toBe('VERIFIED_WITH_GRANT');
    expect(tx.emailVerification.updateMany).toHaveBeenCalledWith({
      where: { id: 'verification-1', usedAt: null },
      data: { usedAt: now },
    });
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', emailVerifiedAt: null },
      data: { emailVerifiedAt: now },
    });
    expect(tx.energyWallet.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', balance: 5 },
      update: { balance: { increment: 5 } },
    });
    expect(tx.energyLedger.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        delta: 5,
        reason: EnergyLedgerReason.SIGNUP_GRANT,
        balanceAfter: 5,
        ref: 'verification-1',
      },
    });
  });

  it('stops without any credit when the token was already consumed', async () => {
    const tx = buildTx(0, 1);
    const prisma = buildPrisma(tx);
    const repository = new EmailVerificationRepository(
      prisma as unknown as PrismaService,
    );

    const outcome = await repository.consumeAndGrant(
      'verification-1',
      'user-1',
      5,
      new Date(),
    );

    expect(outcome).toBe('ALREADY_USED');
    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(tx.energyWallet.upsert).not.toHaveBeenCalled();
    expect(tx.energyLedger.create).not.toHaveBeenCalled();
  });

  it('never credits an account that is already verified', async () => {
    const tx = buildTx(1, 0);
    const prisma = buildPrisma(tx);
    const repository = new EmailVerificationRepository(
      prisma as unknown as PrismaService,
    );

    const outcome = await repository.consumeAndGrant(
      'verification-1',
      'user-1',
      5,
      new Date(),
    );

    expect(outcome).toBe('VERIFIED_WITHOUT_GRANT');
    expect(tx.energyWallet.upsert).not.toHaveBeenCalled();
    expect(tx.energyLedger.create).not.toHaveBeenCalled();
  });
});
