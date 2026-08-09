import { ForbiddenException } from '@nestjs/common';
import {
  EnergyLedgerReason as DbEnergyLedgerReason,
  EnergyWallet,
} from '@prisma/client';
import {
  ENERGY_INSUFFICIENT_ERROR_CODE,
  EnergyLedgerReason,
} from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EnergyRepository } from './energy.repository';
import { EnergyService } from './energy.service';

function buildWallet(overrides: Partial<EnergyWallet> = {}): EnergyWallet {
  return {
    id: 'wallet-1',
    userId: 'user-1',
    balance: 5,
    updatedAt: new Date('2026-06-13T08:00:00Z'),
    ...overrides,
  };
}

const repository = {
  findWallet: vi.fn(),
  spend: vi.fn(),
  hasLedgerRef: vi.fn(),
  findGiftCode: vi.fn(),
  redeemGiftCode: vi.fn(),
};

function buildGiftCode(overrides: Record<string, unknown> = {}) {
  return {
    id: 'gift-1',
    code: 'BIENVENUE-2026',
    energyAmount: 10,
    active: true,
    expiresAt: null,
    maxRedemptions: null,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    _count: { redemptions: 0 },
    ...overrides,
  };
}

const service = new EnergyService(repository as unknown as EnergyRepository);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EnergyService.getState', () => {
  it('serves the balance without any automatic credit', async () => {
    repository.findWallet.mockResolvedValue(buildWallet({ balance: 3 }));

    const state = await service.getState('user-1');

    expect(state.balance).toBe(3);
    expect(state.canStartFull).toBe(false);
    expect(state.canStartAxis).toBe(true);
    expect(repository.spend).not.toHaveBeenCalled();
  });

  it('keeps a purchased balance above five intact', async () => {
    repository.findWallet.mockResolvedValue(buildWallet({ balance: 120 }));

    const state = await service.getState('user-1');

    expect(state.balance).toBe(120);
    expect(state.canStartFull).toBe(true);
  });
});

describe('EnergyService.redeemGiftCode', () => {
  it('normalizes the input, credits the amount and returns the new balance', async () => {
    repository.findGiftCode.mockResolvedValue(buildGiftCode());
    repository.redeemGiftCode.mockResolvedValue(buildWallet({ balance: 13 }));

    const result = await service.redeemGiftCode('user-1', '  bienvenue-2026 ');

    expect(repository.findGiftCode).toHaveBeenCalledWith('BIENVENUE-2026');
    expect(repository.redeemGiftCode).toHaveBeenCalledWith(
      'user-1',
      'gift-1',
      10,
    );
    expect(result).toEqual({ granted: 10, balance: 13 });
  });

  it('rejects an unknown code', async () => {
    repository.findGiftCode.mockResolvedValue(null);

    await expect(service.redeemGiftCode('user-1', 'FAUX-CODE')).rejects.toThrow(
      'GIFT_CODE_INVALID',
    );
    expect(repository.redeemGiftCode).not.toHaveBeenCalled();
  });

  it('rejects an inactive, expired or exhausted code', async () => {
    for (const overrides of [
      { active: false },
      { expiresAt: new Date('2026-01-01T00:00:00Z') },
      { maxRedemptions: 2, _count: { redemptions: 2 } },
    ]) {
      repository.findGiftCode.mockResolvedValue(buildGiftCode(overrides));
      await expect(
        service.redeemGiftCode('user-1', 'BIENVENUE-2026'),
      ).rejects.toThrow('GIFT_CODE_INVALID');
    }
    expect(repository.redeemGiftCode).not.toHaveBeenCalled();
  });

  it('rejects a second redemption by the same user', async () => {
    repository.findGiftCode.mockResolvedValue(buildGiftCode());
    repository.redeemGiftCode.mockResolvedValue(null);

    await expect(
      service.redeemGiftCode('user-1', 'BIENVENUE-2026'),
    ).rejects.toThrow('GIFT_CODE_INVALID');
  });
});

describe('EnergyService.spend', () => {
  it('debits the balance and records the ledger entry through the repository', async () => {
    repository.findWallet.mockResolvedValue(buildWallet({ balance: 5 }));
    repository.spend.mockResolvedValue(buildWallet({ balance: 0 }));

    const state = await service.spend(
      'user-1',
      5,
      EnergyLedgerReason.SESSION_SPENT,
    );

    expect(repository.spend).toHaveBeenCalledTimes(1);
    expect(repository.spend).toHaveBeenCalledWith(
      'user-1',
      5,
      DbEnergyLedgerReason.SESSION_SPENT,
      undefined,
    );
    expect(state.balance).toBe(0);
  });

  it('does not debit a zero-cost tutorial', async () => {
    repository.findWallet.mockResolvedValue(buildWallet({ balance: 5 }));

    await service.spend('user-1', 0, EnergyLedgerReason.SESSION_SPENT);

    expect(repository.spend).not.toHaveBeenCalled();
  });

  it('rejects with the structured insufficient-energy code, balance and cost', async () => {
    repository.findWallet.mockResolvedValue(buildWallet({ balance: 1 }));

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

describe('EnergyService.hasCreditForRef', () => {
  it('delegates the purchase reference lookup to the repository', async () => {
    repository.hasLedgerRef.mockResolvedValue(true);

    await expect(service.hasCreditForRef('user-1', 'cs_test_1')).resolves.toBe(
      true,
    );
    expect(repository.hasLedgerRef).toHaveBeenCalledWith('user-1', 'cs_test_1');
  });
});
