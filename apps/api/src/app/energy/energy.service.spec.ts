import { ForbiddenException } from '@nestjs/common';
import {
  EnergyLedgerReason as DbEnergyLedgerReason,
  EnergyWallet,
  SubscriptionTier as DbSubscriptionTier,
} from '@prisma/client';
import { EnergyLedgerReason, SubscriptionTier } from '@psychotech/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnergyContext, EnergyRepository } from './energy.repository';
import { EnergyService } from './energy.service';

function buildWallet(overrides: Partial<EnergyWallet> = {}): EnergyWallet {
  return {
    id: 'wallet-1',
    userId: 'user-1',
    balance: 5,
    capacity: 5,
    lastResetAt: new Date('2026-06-13T08:00:00Z'),
    updatedAt: new Date('2026-06-13T08:00:00Z'),
    ...overrides,
  };
}

function buildContext(overrides: Partial<EnergyContext> = {}): EnergyContext {
  return {
    wallet: buildWallet(),
    tier: DbSubscriptionTier.ESSENTIAL,
    timezone: 'UTC',
    ...overrides,
  };
}

const repository = {
  findEnergyContext: vi.fn(),
  applyDailyReset: vi.fn(),
  spend: vi.fn(),
};

const service = new EnergyService(repository as unknown as EnergyRepository);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-13T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('EnergyService.spend', () => {
  it('debits the balance and records the ledger entry through the repository', async () => {
    repository.findEnergyContext.mockResolvedValue(
      buildContext({ wallet: buildWallet({ balance: 5 }) }),
    );
    repository.spend.mockResolvedValue(buildWallet({ balance: 0 }));

    const state = await service.spend('user-1', 5, EnergyLedgerReason.SESSION_SPENT);

    expect(repository.spend).toHaveBeenCalledTimes(1);
    expect(repository.spend).toHaveBeenCalledWith(
      'user-1',
      5,
      DbEnergyLedgerReason.SESSION_SPENT,
      undefined,
    );
    expect(repository.applyDailyReset).not.toHaveBeenCalled();
    expect(state.balance).toBe(0);
  });

  it('does not debit the unlimited tier', async () => {
    repository.findEnergyContext.mockResolvedValue(
      buildContext({
        wallet: buildWallet({ balance: 5 }),
        tier: DbSubscriptionTier.UNLIMITED,
      }),
    );

    const state = await service.spend('user-1', 5, EnergyLedgerReason.SESSION_SPENT);

    expect(repository.spend).not.toHaveBeenCalled();
    expect(state.balance).toBe(5);
    expect(state.tier).toBe(SubscriptionTier.UNLIMITED);
  });

  it('does not debit a zero-cost tutorial', async () => {
    repository.findEnergyContext.mockResolvedValue(
      buildContext({ tier: DbSubscriptionTier.FREE, wallet: buildWallet({ balance: 5 }) }),
    );

    await service.spend('user-1', 0, EnergyLedgerReason.SESSION_SPENT);

    expect(repository.spend).not.toHaveBeenCalled();
  });

  it('rejects with a forbidden error when the balance is insufficient', async () => {
    repository.findEnergyContext.mockResolvedValue(
      buildContext({ wallet: buildWallet({ balance: 1 }) }),
    );

    await expect(
      service.spend('user-1', 5, EnergyLedgerReason.SESSION_SPENT),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.spend).not.toHaveBeenCalled();
  });
});

describe('EnergyService lazy daily reset', () => {
  it('resets the balance to capacity before serving the state when the day changed', async () => {
    repository.findEnergyContext.mockResolvedValue(
      buildContext({
        wallet: buildWallet({
          balance: 2,
          lastResetAt: new Date('2026-06-12T08:00:00Z'),
        }),
      }),
    );
    repository.applyDailyReset.mockResolvedValue(
      buildWallet({ balance: 5, lastResetAt: new Date('2026-06-13T10:00:00Z') }),
    );

    const state = await service.getState('user-1');

    expect(repository.applyDailyReset).toHaveBeenCalledTimes(1);
    expect(repository.applyDailyReset).toHaveBeenCalledWith(
      'user-1',
      5,
      expect.any(Date),
      2,
    );
    expect(state.balance).toBe(5);
  });

  it('does not reset within the same local day', async () => {
    repository.findEnergyContext.mockResolvedValue(
      buildContext({ wallet: buildWallet({ balance: 3 }) }),
    );

    const state = await service.getState('user-1');

    expect(repository.applyDailyReset).not.toHaveBeenCalled();
    expect(state.balance).toBe(3);
    expect(state.tier).toBe(SubscriptionTier.ESSENTIAL);
  });
});
