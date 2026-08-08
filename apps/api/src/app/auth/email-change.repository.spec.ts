import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { EmailChangeRepository } from './email-change.repository';

function buildTx() {
  return {
    emailChange: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    user: { update: vi.fn().mockResolvedValue({}) },
    energyWallet: { upsert: vi.fn(), update: vi.fn() },
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

describe('EmailChangeRepository.consumeAndSwap', () => {
  it('swaps the email in a single-use transaction without any wallet write', async () => {
    const tx = buildTx();
    const repository = new EmailChangeRepository(
      buildPrisma(tx) as unknown as PrismaService,
    );

    const outcome = await repository.consumeAndSwap(
      'change-1',
      'user-1',
      'nouvelle@exemple.fr',
      new Date('2026-08-08T10:00:00Z'),
    );

    expect(outcome).toBe('CHANGED');
    expect(tx.emailChange.updateMany).toHaveBeenCalledWith({
      where: { id: 'change-1', usedAt: null },
      data: { usedAt: new Date('2026-08-08T10:00:00Z') },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        email: 'nouvelle@exemple.fr',
        emailVerifiedAt: new Date('2026-08-08T10:00:00Z'),
        pendingEmail: null,
      },
    });
    expect(tx.energyWallet.upsert).not.toHaveBeenCalled();
    expect(tx.energyWallet.update).not.toHaveBeenCalled();
    expect(tx.energyLedger.create).not.toHaveBeenCalled();
  });

  it('returns ALREADY_USED when the token was consumed concurrently', async () => {
    const tx = buildTx();
    tx.emailChange.updateMany.mockResolvedValue({ count: 0 });
    const repository = new EmailChangeRepository(
      buildPrisma(tx) as unknown as PrismaService,
    );

    const outcome = await repository.consumeAndSwap(
      'change-1',
      'user-1',
      'nouvelle@exemple.fr',
      new Date(),
    );

    expect(outcome).toBe('ALREADY_USED');
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('reports the address as taken when the unique constraint fires at swap', async () => {
    const tx = buildTx();
    tx.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    const repository = new EmailChangeRepository(
      buildPrisma(tx) as unknown as PrismaService,
    );

    const outcome = await repository.consumeAndSwap(
      'change-1',
      'user-1',
      'prise@exemple.fr',
      new Date(),
    );

    expect(outcome).toBe('EMAIL_TAKEN');
  });
});
