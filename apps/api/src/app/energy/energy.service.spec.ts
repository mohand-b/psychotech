import { ForbiddenException } from '@nestjs/common';
import {
  EnergyLedgerReason as DbEnergyLedgerReason,
  EnergyWallet,
} from '@prisma/client';
import {
  ENERGY_INSUFFICIENT_ERROR_CODE,
  EnergyLedgerReason,
} from '@psychotech/shared';
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
    timezone: 'UTC',
    ...overrides,
  };
}

const repository = {
  findEnergyContext: vi.fn(),
  applyDailyReset: vi.fn(),
  spend: vi.fn(),
  creditToCapacity: vi.fn(),
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


  it('does not debit a zero-cost tutorial', async () => {
    repository.findEnergyContext.mockResolvedValue(
      buildContext({ wallet: buildWallet({ balance: 5 }) }),
    );

    await service.spend('user-1', 0, EnergyLedgerReason.SESSION_SPENT);

    expect(repository.spend).not.toHaveBeenCalled();
  });

  it('rejects with the structured insufficient-energy code, balance and cost', async () => {
    repository.findEnergyContext.mockResolvedValue(
      buildContext({ wallet: buildWallet({ balance: 1 }) }),
    );

    const rejection = service.spend(
      'user-1',
      5,
      EnergyLedgerReason.SESSION_SPENT,
    );
    await expect(rejection).rejects.toBeInstanceOf(ForbiddenException);
    await rejection.catch((error: ForbiddenException) => {
      expect(error.getResponse()).toMatchObject({
        message: ENERGY_INSUFFICIENT_ERROR_CODE,
        balance: 1,
        cost: 5,
      });
    });
    expect(repository.spend).not.toHaveBeenCalled();
  });
});

describe('EnergyService.creditPurchasedRefill', () => {
  it('refills the balance to capacity and records the purchase reference', async () => {
    repository.findEnergyContext.mockResolvedValue(
      buildContext({ wallet: buildWallet({ balance: 1 }) }),
    );
    repository.creditToCapacity.mockResolvedValue(buildWallet({ balance: 5 }));

    const state = await service.creditPurchasedRefill('user-1', 'cs_test_1');

    expect(repository.creditToCapacity).toHaveBeenCalledWith(
      'user-1',
      DbEnergyLedgerReason.PURCHASE,
      'cs_test_1',
    );
    expect(state.balance).toBe(5);
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
  });

  it('never clamps a purchased balance above capacity on the daily refill', async () => {
    repository.findEnergyContext.mockResolvedValue(
      buildContext({
        wallet: buildWallet({
          balance: 7,
          lastResetAt: new Date('2026-06-12T08:00:00Z'),
        }),
      }),
    );
    repository.applyDailyReset.mockResolvedValue(
      buildWallet({ balance: 7, lastResetAt: new Date('2026-06-13T10:00:00Z') }),
    );

    const state = await service.getState('user-1');

    expect(repository.applyDailyReset).toHaveBeenCalledWith(
      'user-1',
      5,
      expect.any(Date),
      7,
    );
    expect(state.balance).toBe(7);
  });
});
