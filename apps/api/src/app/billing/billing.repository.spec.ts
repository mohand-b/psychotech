import { EnergyLedgerReason, Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { BillingRepository } from './billing.repository';

function uniqueViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('duplicate', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

function buildTx(eventCreate: ReturnType<typeof vi.fn>) {
  return {
    stripeEvent: { create: eventCreate },
    energyWallet: {
      upsert: vi.fn().mockResolvedValue({ userId: 'user-1', balance: 20 }),
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

describe('BillingRepository.creditPackPurchaseOnce', () => {
  it('credits the pack and writes the ledger inside the dedup transaction', async () => {
    const tx = buildTx(vi.fn().mockResolvedValue({}));
    const prisma = buildPrisma(tx);
    const repository = new BillingRepository(prisma as unknown as PrismaService);

    const credited = await repository.creditPackPurchaseOnce(
      'evt_1',
      'user-1',
      15,
      'cs_test_1',
    );

    expect(credited).toBe(true);
    expect(tx.stripeEvent.create).toHaveBeenCalledWith({
      data: { id: 'evt_1' },
    });
    expect(tx.energyWallet.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', balance: 15 },
      update: { balance: { increment: 15 } },
    });
    expect(tx.energyLedger.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        delta: 15,
        reason: EnergyLedgerReason.PURCHASE,
        balanceAfter: 20,
        ref: 'cs_test_1',
      },
    });
  });

  it('never credits twice for the same event id', async () => {
    const tx = buildTx(vi.fn().mockRejectedValue(uniqueViolation()));
    const prisma = buildPrisma(tx);
    const repository = new BillingRepository(prisma as unknown as PrismaService);

    const credited = await repository.creditPackPurchaseOnce(
      'evt_1',
      'user-1',
      15,
      'cs_test_1',
    );

    expect(credited).toBe(false);
    expect(tx.energyWallet.upsert).not.toHaveBeenCalled();
    expect(tx.energyLedger.create).not.toHaveBeenCalled();
  });

  it('rethrows non-duplicate transaction failures', async () => {
    const tx = buildTx(vi.fn().mockRejectedValue(new Error('db down')));
    const prisma = buildPrisma(tx);
    const repository = new BillingRepository(prisma as unknown as PrismaService);

    await expect(
      repository.creditPackPurchaseOnce('evt_1', 'user-1', 15, 'cs_test_1'),
    ).rejects.toThrow('db down');
  });
});
