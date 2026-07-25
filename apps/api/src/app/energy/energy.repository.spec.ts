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

  it('keeps a balance above capacity untouched and skips the ledger entry', async () => {
    const { prisma, tx } = buildPrismaMock(7);
    const repository = new EnergyRepository(prisma as unknown as PrismaService);
    const resetAt = new Date('2026-06-13T10:00:00Z');

    await repository.applyDailyReset('user-1', 5, resetAt, 7);

    expect(tx.energyWallet.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { balance: 7, lastResetAt: resetAt },
    });
    expect(tx.energyLedger.create).not.toHaveBeenCalled();
  });
});

describe('EnergyRepository.creditToCapacity', () => {
  function buildCreditPrisma(balance: number) {
    const tx = {
      energyWallet: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ userId: 'user-1', balance, capacity: 5 }),
        update: vi.fn().mockResolvedValue({
          userId: 'user-1',
          balance: 5,
          capacity: 5,
        }),
      },
      energyLedger: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    return { prisma, tx };
  }

  it('sets the balance back to capacity and records the purchase with its reference', async () => {
    const { prisma, tx } = buildCreditPrisma(1);
    const repository = new EnergyRepository(prisma as unknown as PrismaService);

    const wallet = await repository.creditToCapacity(
      'user-1',
      EnergyLedgerReason.PURCHASE,
      'cs_test_1',
    );

    expect(tx.energyWallet.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { balance: 5 },
    });
    expect(tx.energyLedger.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        delta: 4,
        reason: EnergyLedgerReason.PURCHASE,
        balanceAfter: 5,
        ref: 'cs_test_1',
      },
    });
    expect(wallet.balance).toBe(5);
  });

  it('never pushes the balance above capacity and skips the ledger when already full', async () => {
    const { prisma, tx } = buildCreditPrisma(5);
    const repository = new EnergyRepository(prisma as unknown as PrismaService);

    const wallet = await repository.creditToCapacity(
      'user-1',
      EnergyLedgerReason.PURCHASE,
      'cs_test_2',
    );

    expect(tx.energyWallet.update).not.toHaveBeenCalled();
    expect(tx.energyLedger.create).not.toHaveBeenCalled();
    expect(wallet.balance).toBe(5);
  });
});

describe('EnergyRepository.findEnergyContext', () => {
  it('creates the wallet lazily when the user exists without one', async () => {
    const created = {
      id: 'wallet-1',
      userId: 'user-1',
      balance: 5,
      capacity: 5,
    };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          timezone: 'Europe/Paris',
          energyWallet: null,
          subscription: null,
        }),
      },
      energyWallet: { create: vi.fn().mockResolvedValue(created) },
    };
    const repository = new EnergyRepository(prisma as unknown as PrismaService);

    const context = await repository.findEnergyContext('user-1');

    expect(prisma.energyWallet.create).toHaveBeenCalledWith({
      data: { userId: 'user-1' },
    });
    expect(context?.wallet).toEqual(created);
    expect(context?.timezone).toBe('Europe/Paris');
  });
});
