import { EnergyLedgerReason, PaymentProvider, Prisma } from '@prisma/client';
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
    packPurchase: { create: vi.fn().mockResolvedValue({}) },
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
    const repository = new BillingRepository(
      prisma as unknown as PrismaService,
    );

    const credited = await repository.creditPackPurchaseOnce(
      'evt_1',
      'user-1',
      'DISCOVERY',
      15,
      290,
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
    const repository = new BillingRepository(
      prisma as unknown as PrismaService,
    );

    const credited = await repository.creditPackPurchaseOnce(
      'evt_1',
      'user-1',
      'DISCOVERY',
      15,
      290,
      'cs_test_1',
    );

    expect(credited).toBe(false);
    expect(tx.energyWallet.upsert).not.toHaveBeenCalled();
    expect(tx.energyLedger.create).not.toHaveBeenCalled();
  });

  it('rethrows non-duplicate transaction failures', async () => {
    const tx = buildTx(vi.fn().mockRejectedValue(new Error('db down')));
    const prisma = buildPrisma(tx);
    const repository = new BillingRepository(
      prisma as unknown as PrismaService,
    );

    await expect(
      repository.creditPackPurchaseOnce(
        'evt_1',
        'user-1',
        'DISCOVERY',
        15,
        290,
        'cs_test_1',
      ),
    ).rejects.toThrow('db down');
  });
});

describe('BillingRepository.creditGooglePlayPurchaseOnce', () => {
  it('credits the pack once and records the purchase token as a Google Play payment', async () => {
    const tx = buildTx(vi.fn());
    const prisma = buildPrisma(tx);
    const repository = new BillingRepository(
      prisma as unknown as PrismaService,
    );

    const credited = await repository.creditGooglePlayPurchaseOnce({
      userId: 'user-1',
      packId: 'DISCOVERY',
      energyAmount: 15,
      amountCents: 290,
      purchaseToken: 'play-token-1',
    });

    expect(credited).toBe(true);
    expect(tx.stripeEvent.create).not.toHaveBeenCalled();
    expect(tx.packPurchase.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        packId: 'DISCOVERY',
        energyAmount: 15,
        amountCents: 290,
        provider: PaymentProvider.GOOGLE_PLAY,
        paymentRef: 'play-token-1',
      },
    });
  });

  it('never credits the same purchase token twice', async () => {
    const tx = buildTx(vi.fn());
    tx.packPurchase.create.mockRejectedValue(uniqueViolation());
    const prisma = buildPrisma(tx);
    const repository = new BillingRepository(
      prisma as unknown as PrismaService,
    );

    const credited = await repository.creditGooglePlayPurchaseOnce({
      userId: 'user-1',
      packId: 'DISCOVERY',
      energyAmount: 15,
      amountCents: 290,
      purchaseToken: 'play-token-1',
    });

    expect(credited).toBe(false);
  });
});

describe('BillingRepository.revokeGooglePlayPurchaseOnce', () => {
  function buildRevocationTx(purchase: object | null, balance: number) {
    return {
      packPurchase: {
        findUnique: vi.fn().mockResolvedValue(purchase),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      energyWallet: {
        findUnique: vi.fn().mockResolvedValue({ userId: 'user-1', balance }),
        upsert: vi.fn().mockImplementation(({ update }) =>
          Promise.resolve({
            userId: 'user-1',
            balance: balance - update.balance.decrement,
          }),
        ),
      },
      energyLedger: { create: vi.fn().mockResolvedValue({}) },
    };
  }

  const refundedPurchase = {
    id: 'purchase-1',
    userId: 'user-1',
    energyAmount: 15,
    provider: PaymentProvider.GOOGLE_PLAY,
    revokedAt: null,
  };

  it('withdraws the purchased credits, never below zero, and logs the revocation', async () => {
    const tx = buildRevocationTx(refundedPurchase, 9);
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const repository = new BillingRepository(
      prisma as unknown as PrismaService,
    );
    const revokedAt = new Date('2026-10-13T10:00:00.000Z');

    const revoked = await repository.revokeGooglePlayPurchaseOnce(
      'play-token-1',
      revokedAt,
    );

    expect(revoked).toBe(true);
    expect(tx.packPurchase.updateMany).toHaveBeenCalledWith({
      where: { id: 'purchase-1', revokedAt: null },
      data: { revokedAt },
    });
    expect(tx.energyLedger.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        delta: -9,
        reason: EnergyLedgerReason.PURCHASE_REVOKED,
        balanceAfter: 0,
        ref: 'play-token-1',
      },
    });
  });

  it('ignores a purchase that was already revoked or never credited', async () => {
    const tx = buildRevocationTx(null, 9);
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const repository = new BillingRepository(
      prisma as unknown as PrismaService,
    );

    const revoked = await repository.revokeGooglePlayPurchaseOnce(
      'unknown-token',
      new Date(),
    );

    expect(revoked).toBe(false);
    expect(tx.energyLedger.create).not.toHaveBeenCalled();
  });
});
