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

interface GiftRedemptionRow {
  codeId: string;
  userId: string;
}

function buildGiftCodeDatabase(maxRedemptions: number | null) {
  const redemptions: GiftRedemptionRow[] = [];
  let rowLockReleased: Promise<void> = Promise.resolve();
  const prisma = {
    $transaction: vi.fn(
      async (callback: (client: object) => Promise<unknown>) => {
        let releaseRowLock = (): void => undefined;
        const tx = {
          $queryRaw: vi.fn(async (query: TemplateStringsArray) => {
            if (query.join('').includes('FOR UPDATE')) {
              const previousHolderReleased = rowLockReleased;
              rowLockReleased = new Promise((resolve) => {
                releaseRowLock = resolve;
              });
              await previousHolderReleased;
            }
            return [{ maxRedemptions }];
          }),
          giftRedemption: {
            count: vi.fn(async () => redemptions.length),
            create: vi.fn(async ({ data }: { data: GiftRedemptionRow }) => {
              redemptions.push(data);
              return data;
            }),
          },
          energyWallet: {
            upsert: vi.fn(
              async ({
                create,
              }: {
                create: { userId: string; balance: number };
              }) => create,
            ),
          },
          energyLedger: { create: vi.fn().mockResolvedValue({}) },
        };
        try {
          return await callback(tx);
        } finally {
          releaseRowLock();
        }
      },
    ),
  };
  return { prisma, redemptions };
}

describe('EnergyRepository.redeemGiftCode', () => {
  it('credits only one of two accounts redeeming a single-use code at the same moment', async () => {
    const { prisma, redemptions } = buildGiftCodeDatabase(1);
    const repository = new EnergyRepository(prisma as unknown as PrismaService);

    const [first, second] = await Promise.all([
      repository.redeemGiftCode('user-1', 'gift-1', 300),
      repository.redeemGiftCode('user-2', 'gift-1', 300),
    ]);

    expect(first).toEqual({ userId: 'user-1', balance: 300 });
    expect(second).toBeNull();
    expect(redemptions).toEqual([{ codeId: 'gift-1', userId: 'user-1' }]);
  });

  it('credits every account redeeming at the same moment a code without redemption limit', async () => {
    const { prisma, redemptions } = buildGiftCodeDatabase(null);
    const repository = new EnergyRepository(prisma as unknown as PrismaService);

    const [first, second] = await Promise.all([
      repository.redeemGiftCode('user-1', 'gift-1', 5),
      repository.redeemGiftCode('user-2', 'gift-1', 5),
    ]);

    expect(first).toEqual({ userId: 'user-1', balance: 5 });
    expect(second).toEqual({ userId: 'user-2', balance: 5 });
    expect(redemptions).toHaveLength(2);
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
