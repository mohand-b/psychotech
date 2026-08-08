import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { EnergyPackId } from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EnergyService } from '../energy/energy.service';
import { BillingRepository } from './billing.repository';
import { BillingService } from './billing.service';

function buildCheckoutEvent(
  overrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Event {
  return {
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        payment_status: 'paid',
        metadata: { userId: 'user-1', packId: EnergyPackId.DISCOVERY },
        ...overrides,
      },
    },
  } as unknown as Stripe.Event;
}

const repository = {
  registerEvent: vi.fn(),
  creditPackPurchaseOnce: vi.fn(),
  findUserById: vi.fn(),
  saveStripeCustomerId: vi.fn(),
};

const energyService = { hasCreditForRef: vi.fn() };

let incomingEvent: Stripe.Event;

const stripe = {
  webhooks: { constructEvent: vi.fn(() => incomingEvent) },
} as unknown as Stripe;

const configService = {
  getOrThrow: () => ({
    enabled: true,
    secretKey: 'sk_test',
    publishableKey: 'pk_test',
    webhookSecret: 'whsec_test',
    appBaseUrl: 'http://localhost:4200',
    packPriceIds: { [EnergyPackId.DISCOVERY]: 'price_1' },
  }),
} as unknown as ConfigService;

const service = new BillingService(
  stripe,
  repository as unknown as BillingRepository,
  energyService as unknown as EnergyService,
  configService,
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BillingService.handleWebhook checkout.session.completed', () => {
  it('credits the pack through the deduplicating transaction', async () => {
    incomingEvent = buildCheckoutEvent();
    repository.creditPackPurchaseOnce.mockResolvedValue(true);

    await service.handleWebhook(Buffer.from('{}'), 'sig');

    expect(repository.creditPackPurchaseOnce).toHaveBeenCalledWith(
      'evt_1',
      'user-1',
      'DISCOVERY',
      15,
      290,
      'cs_test_1',
    );
    expect(repository.registerEvent).not.toHaveBeenCalled();
  });

  it('replays of the same event never credit twice', async () => {
    incomingEvent = buildCheckoutEvent();
    repository.creditPackPurchaseOnce
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await service.handleWebhook(Buffer.from('{}'), 'sig');
    await service.handleWebhook(Buffer.from('{}'), 'sig');

    expect(repository.creditPackPurchaseOnce).toHaveBeenCalledTimes(2);
    expect(repository.creditPackPurchaseOnce).toHaveBeenNthCalledWith(
      2,
      'evt_1',
      'user-1',
      'DISCOVERY',
      15,
      290,
      'cs_test_1',
    );
  });

  it('registers without crediting when the session is not paid', async () => {
    incomingEvent = buildCheckoutEvent({ payment_status: 'unpaid' });

    await service.handleWebhook(Buffer.from('{}'), 'sig');

    expect(repository.creditPackPurchaseOnce).not.toHaveBeenCalled();
    expect(repository.registerEvent).toHaveBeenCalledWith('evt_1');
  });

  it('registers without crediting when the metadata names no known pack', async () => {
    incomingEvent = buildCheckoutEvent({ metadata: { userId: 'user-1' } });

    await service.handleWebhook(Buffer.from('{}'), 'sig');

    expect(repository.creditPackPurchaseOnce).not.toHaveBeenCalled();
    expect(repository.registerEvent).toHaveBeenCalledWith('evt_1');
  });
});
