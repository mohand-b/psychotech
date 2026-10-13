import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ENERGY_PACK_BY_ID,
  EnergyPackId,
  GOOGLE_PLAY_PRODUCT_IDS,
} from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingRepository } from '../billing.repository';
import { GooglePlayBillingService } from './google-play-billing.service';
import {
  GooglePlayClient,
  GooglePlayConsumptionState,
  GooglePlayPurchaseState,
  GooglePlayRequestError,
} from './google-play.client';

const USER_ID = 'user-1';
const PURCHASE_TOKEN = 'purchase-token-1';
const DISCOVERY_PACK = ENERGY_PACK_BY_ID.get(EnergyPackId.DISCOVERY);
const DISCOVERY_PRODUCT_ID = GOOGLE_PLAY_PRODUCT_IDS[EnergyPackId.DISCOVERY];

const client = {
  isConfigured: vi.fn(),
  fetchProductPurchase: vi.fn(),
  consumeProductPurchase: vi.fn(),
  listVoidedPurchases: vi.fn(),
};

const repository = {
  creditGooglePlayPurchaseOnce: vi.fn(),
  findPurchaseOwnerId: vi.fn(),
  revokeGooglePlayPurchaseOnce: vi.fn(),
};

const service = new GooglePlayBillingService(
  client as unknown as GooglePlayClient,
  repository as unknown as BillingRepository,
);

function purchased(consumptionState: GooglePlayConsumptionState) {
  return { purchaseState: GooglePlayPurchaseState.PURCHASED, consumptionState };
}

beforeEach(() => {
  vi.clearAllMocks();
  client.isConfigured.mockReturnValue(true);
  client.consumeProductPurchase.mockResolvedValue(undefined);
});

describe('GooglePlayBillingService.creditPurchase', () => {
  it('credits a completed purchase once with the pack amount, then consumes it', async () => {
    client.fetchProductPurchase.mockResolvedValue(
      purchased(GooglePlayConsumptionState.NOT_CONSUMED),
    );
    repository.creditGooglePlayPurchaseOnce.mockResolvedValue(true);

    const result = await service.creditPurchase(
      USER_ID,
      EnergyPackId.DISCOVERY,
      PURCHASE_TOKEN,
    );

    expect(result).toEqual({ status: 'credited' });
    expect(client.fetchProductPurchase).toHaveBeenCalledWith(
      DISCOVERY_PRODUCT_ID,
      PURCHASE_TOKEN,
    );
    expect(repository.creditGooglePlayPurchaseOnce).toHaveBeenCalledWith({
      userId: USER_ID,
      packId: EnergyPackId.DISCOVERY,
      energyAmount: DISCOVERY_PACK?.energyAmount,
      amountCents: DISCOVERY_PACK?.priceCents,
      purchaseToken: PURCHASE_TOKEN,
    });
    expect(client.consumeProductPurchase).toHaveBeenCalledWith(
      DISCOVERY_PRODUCT_ID,
      PURCHASE_TOKEN,
    );
  });

  it('keeps the credit when consuming the purchase fails, leaving it to the next recovery', async () => {
    client.fetchProductPurchase.mockResolvedValue(
      purchased(GooglePlayConsumptionState.NOT_CONSUMED),
    );
    repository.creditGooglePlayPurchaseOnce.mockResolvedValue(true);
    client.consumeProductPurchase.mockRejectedValue(
      new GooglePlayRequestError(503, 'unavailable'),
    );

    const result = await service.creditPurchase(
      USER_ID,
      EnergyPackId.DISCOVERY,
      PURCHASE_TOKEN,
    );

    expect(result).toEqual({ status: 'credited' });
  });

  it('consumes an already credited purchase left unconsumed by an earlier attempt', async () => {
    client.fetchProductPurchase.mockResolvedValue(
      purchased(GooglePlayConsumptionState.NOT_CONSUMED),
    );
    repository.creditGooglePlayPurchaseOnce.mockResolvedValue(false);
    repository.findPurchaseOwnerId.mockResolvedValue(USER_ID);

    const result = await service.creditPurchase(
      USER_ID,
      EnergyPackId.DISCOVERY,
      PURCHASE_TOKEN,
    );

    expect(result).toEqual({ status: 'credited' });
    expect(client.consumeProductPurchase).toHaveBeenCalledWith(
      DISCOVERY_PRODUCT_ID,
      PURCHASE_TOKEN,
    );
  });

  it('confirms an already credited purchase of the same account without crediting again', async () => {
    client.fetchProductPurchase.mockResolvedValue(
      purchased(GooglePlayConsumptionState.CONSUMED),
    );
    repository.creditGooglePlayPurchaseOnce.mockResolvedValue(false);
    repository.findPurchaseOwnerId.mockResolvedValue(USER_ID);

    const result = await service.creditPurchase(
      USER_ID,
      EnergyPackId.DISCOVERY,
      PURCHASE_TOKEN,
    );

    expect(result).toEqual({ status: 'credited' });
    expect(client.consumeProductPurchase).not.toHaveBeenCalled();
  });

  it('refuses a purchase token already credited to another account', async () => {
    client.fetchProductPurchase.mockResolvedValue(
      purchased(GooglePlayConsumptionState.CONSUMED),
    );
    repository.creditGooglePlayPurchaseOnce.mockResolvedValue(false);
    repository.findPurchaseOwnerId.mockResolvedValue('user-2');

    await expect(
      service.creditPurchase(USER_ID, EnergyPackId.DISCOVERY, PURCHASE_TOKEN),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('waits for a pending purchase without crediting it', async () => {
    client.fetchProductPurchase.mockResolvedValue({
      purchaseState: GooglePlayPurchaseState.PENDING,
      consumptionState: GooglePlayConsumptionState.NOT_CONSUMED,
    });

    const result = await service.creditPurchase(
      USER_ID,
      EnergyPackId.DISCOVERY,
      PURCHASE_TOKEN,
    );

    expect(result).toEqual({ status: 'pending' });
    expect(repository.creditGooglePlayPurchaseOnce).not.toHaveBeenCalled();
  });

  it('refuses a canceled purchase', async () => {
    client.fetchProductPurchase.mockResolvedValue({
      purchaseState: GooglePlayPurchaseState.CANCELED,
      consumptionState: GooglePlayConsumptionState.NOT_CONSUMED,
    });

    await expect(
      service.creditPurchase(USER_ID, EnergyPackId.DISCOVERY, PURCHASE_TOKEN),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.creditGooglePlayPurchaseOnce).not.toHaveBeenCalled();
  });

  it('refuses a purchase token that Google Play does not know', async () => {
    client.fetchProductPurchase.mockRejectedValue(
      new GooglePlayRequestError(404, 'not found'),
    );

    await expect(
      service.creditPurchase(USER_ID, EnergyPackId.DISCOVERY, PURCHASE_TOKEN),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reports the verification as unavailable when Google Play fails', async () => {
    client.fetchProductPurchase.mockRejectedValue(
      new GooglePlayRequestError(503, 'unavailable'),
    );

    await expect(
      service.creditPurchase(USER_ID, EnergyPackId.DISCOVERY, PURCHASE_TOKEN),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('is unavailable until the service account is configured', async () => {
    client.isConfigured.mockReturnValue(false);

    await expect(
      service.creditPurchase(USER_ID, EnergyPackId.DISCOVERY, PURCHASE_TOKEN),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(client.fetchProductPurchase).not.toHaveBeenCalled();
  });
});

describe('GooglePlayBillingService.revokeVoidedPurchases', () => {
  it('revokes the credits of every voided purchase at its voided time', async () => {
    const voidedTimeMillis = '1760350000000';
    client.listVoidedPurchases.mockResolvedValue([
      { purchaseToken: PURCHASE_TOKEN, voidedTimeMillis },
    ]);
    repository.revokeGooglePlayPurchaseOnce.mockResolvedValue(true);

    await service.revokeVoidedPurchases();

    expect(repository.revokeGooglePlayPurchaseOnce).toHaveBeenCalledWith(
      PURCHASE_TOKEN,
      new Date(Number(voidedTimeMillis)),
    );
  });

  it('does nothing until the service account is configured', async () => {
    client.isConfigured.mockReturnValue(false);

    await service.revokeVoidedPurchases();

    expect(client.listVoidedPurchases).not.toHaveBeenCalled();
  });

  it('survives a Google Play failure without throwing', async () => {
    client.listVoidedPurchases.mockRejectedValue(new Error('network down'));

    await expect(service.revokeVoidedPurchases()).resolves.toBeUndefined();
  });
});
