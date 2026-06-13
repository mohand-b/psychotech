import { EnergyLedgerReason } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { EnergyRepository } from './energy.repository';

function buildPrismaMock(updatedBalance: number) {
  const tx = {
    energyWallet: { update: vi.fn().mockResolvedValue({ balance: updatedBalance }) },
    energyLedger: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: vi.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  return { prisma, tx };
}

describe('EnergyRepository.spend', () => {
  it('decrements the balance and writes the ledger entry inside a single transaction', async () => {
    const { prisma, tx } = buildPrismaMock(0);
    const repository = new EnergyRepository(prisma as unknown as PrismaService);

    const wallet = await repository.spend(
      'user-1',
      5,
      EnergyLedgerReason.SESSION_SPENT,
      'session-1',
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.energyWallet.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { balance: { decrement: 5 } },
    });
    expect(tx.energyLedger.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        delta: -5,
        reason: EnergyLedgerReason.SESSION_SPENT,
        balanceAfter: 0,
        sessionId: 'session-1',
      },
    });
    expect(wallet.balance).toBe(0);
  });
});

describe('EnergyRepository.applyDailyReset', () => {
  it('sets the balance to capacity and writes a daily reset ledger entry in one transaction', async () => {
    const { prisma, tx } = buildPrismaMock(5);
    const repository = new EnergyRepository(prisma as unknown as PrismaService);
    const resetAt = new Date('2026-06-13T10:00:00Z');

    await repository.applyDailyReset('user-1', 5, resetAt, 2);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.energyWallet.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { balance: 5, lastResetAt: resetAt },
    });
    expect(tx.energyLedger.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        delta: 3,
        reason: EnergyLedgerReason.DAILY_RESET,
        balanceAfter: 5,
      },
    });
  });
});
