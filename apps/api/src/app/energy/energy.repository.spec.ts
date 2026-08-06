import { EnergyLedgerReason } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { EnergyRepository } from './energy.repository';

function buildPrismaMock(updatedBalance: number) {
  const tx = {
    energyWallet: {
      update: vi.fn().mockResolvedValue({ balance: updatedBalance }),
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

describe('EnergyRepository.hasLedgerRef', () => {
  it('reports whether a ledger entry carries the reference', async () => {
    const prisma = {
      energyLedger: {
        findFirst: vi.fn().mockResolvedValue({ id: 'ledger-1' }),
      },
    };
    const repository = new EnergyRepository(prisma as unknown as PrismaService);

    await expect(repository.hasLedgerRef('user-1', 'cs_test_1')).resolves.toBe(
      true,
    );
    expect(prisma.energyLedger.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', ref: 'cs_test_1' },
      select: { id: true },
    });
  });
});

describe('EnergyRepository.findWallet', () => {
  it('creates the wallet lazily when the user exists without one', async () => {
    const created = {
      id: 'wallet-1',
      userId: 'user-1',
      balance: 5,
    };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          timezone: 'Europe/Paris',
          energyWallet: null,
        }),
      },
      energyWallet: { create: vi.fn().mockResolvedValue(created) },
    };
    const repository = new EnergyRepository(prisma as unknown as PrismaService);

    const wallet = await repository.findWallet('user-1');

    expect(prisma.energyWallet.create).toHaveBeenCalledWith({
      data: { userId: 'user-1' },
    });
    expect(wallet).toEqual(created);
  });
});
