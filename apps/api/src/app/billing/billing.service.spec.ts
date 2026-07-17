import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SubscriptionStatus as DbSubscriptionStatus,
  SubscriptionTier as DbSubscriptionTier,
} from '@prisma/client';
import { SubscriptionTier } from '@psychotech/shared';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingRepository } from './billing.repository';
import { BillingService } from './billing.service';

const WEBHOOK_SECRET = 'whsec_test';

const configService = {
  getOrThrow: () => ({
    enabled: true,
    secretKey: 'sk_test_x',
    webhookSecret: WEBHOOK_SECRET,
    priceEssential: 'price_essential',
    priceUnlimited: 'price_unlimited',
  }),
} as unknown as ConfigService;

function buildStripeSubscription(
  overrides: Record<string, unknown> = {},
): Stripe.Subscription {
  return {
    id: 'sub_1',
    customer: 'cus_1',
    status: 'active',
    cancel_at_period_end: false,
    items: {
      data: [
        {
          price: { id: 'price_essential' },
          current_period_end: 1_800_000_000,
        },
      ],
    },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

const repository = {
  findUserById: vi.fn(),
  findUserIdByStripeCustomerId: vi.fn(),
  saveStripeCustomerId: vi.fn(),
  findSubscriptionByUserId: vi.fn(),
  registerEvent: vi.fn(),
  upsertSubscription: vi.fn(),
};

const constructEvent = vi.fn();
const listPromotionCodes = vi.fn();
const createCheckoutSession = vi.fn();
const stripe = {
  webhooks: { constructEvent },
  subscriptions: { retrieve: vi.fn() },
  promotionCodes: { list: listPromotionCodes },
  checkout: { sessions: { create: createCheckoutSession } },
} as unknown as Stripe;

function buildStripePromotion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'promo_1',
    code: 'PSYCHO20',
    active: true,
    promotion: {
      type: 'coupon',
      coupon: {
        valid: true,
        percent_off: 20,
        amount_off: null,
        currency: null,
        duration: 'repeating',
        duration_in_months: 12,
      },
    },
    ...overrides,
  };
}

const service = new BillingService(
  stripe,
  repository as unknown as BillingRepository,
  configService,
);

function stubEvent(type: string, object: unknown, id = 'evt_1'): void {
  constructEvent.mockReturnValue({ id, type, data: { object } });
}

const PAYLOAD = Buffer.from('{}');
const SIGNATURE = 't=1,v1=abc';

beforeEach(() => {
  vi.clearAllMocks();
  repository.registerEvent.mockResolvedValue(true);
});

describe('BillingService.findPromotionCode', () => {
  it('returns the mapped promotion for an active code', async () => {
    listPromotionCodes.mockResolvedValue({ data: [buildStripePromotion()] });

    const promotion = await service.findPromotionCode('PSYCHO20');

    expect(promotion).toMatchObject({ code: 'PSYCHO20', percentOff: 20 });
    expect(listPromotionCodes).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PSYCHO20', active: true }),
    );
  });

  it('rejects an unknown code with a not found error', async () => {
    listPromotionCodes.mockResolvedValue({ data: [] });

    await expect(service.findPromotionCode('NOPE')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('BillingService.createCheckoutSession promotion', () => {
  it('rejects an unknown promotion code before creating the session', async () => {
    repository.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.c',
      firstName: 'A',
      lastName: 'B',
      stripeCustomerId: 'cus_1',
    });
    listPromotionCodes.mockResolvedValue({ data: [] });

    await expect(
      service.createCheckoutSession(
        'user-1',
        SubscriptionTier.ESSENTIAL,
        'http://localhost:4200',
        'NOPE',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it('passes the promotion discount to the checkout session', async () => {
    repository.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.c',
      firstName: 'A',
      lastName: 'B',
      stripeCustomerId: 'cus_1',
    });
    listPromotionCodes.mockResolvedValue({ data: [buildStripePromotion()] });
    createCheckoutSession.mockResolvedValue({ url: 'https://stripe.test/s' });

    const redirect = await service.createCheckoutSession(
      'user-1',
      SubscriptionTier.ESSENTIAL,
      'http://localhost:4200',
      'PSYCHO20',
    );

    expect(redirect).toEqual({ url: 'https://stripe.test/s' });
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        discounts: [{ promotion_code: 'promo_1' }],
      }),
    );
  });
});

describe('BillingService.handleWebhook signature', () => {
  it('rejects an invalid signature with a bad request', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    await expect(
      service.handleWebhook(PAYLOAD, SIGNATURE),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.registerEvent).not.toHaveBeenCalled();
  });

  it('rejects a missing raw body or signature', async () => {
    await expect(
      service.handleWebhook(undefined, SIGNATURE),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.handleWebhook(PAYLOAD, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('BillingService.handleWebhook idempotence', () => {
  it('processes a replayed event exactly once', async () => {
    stubEvent('customer.subscription.updated', buildStripeSubscription());
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');
    repository.registerEvent
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await service.handleWebhook(PAYLOAD, SIGNATURE);
    await service.handleWebhook(PAYLOAD, SIGNATURE);

    expect(repository.upsertSubscription).toHaveBeenCalledTimes(1);
  });
});

describe('BillingService.handleWebhook subscription upsert', () => {
  it('maps the price and status onto the stored subscription', async () => {
    stubEvent('customer.subscription.updated', buildStripeSubscription());
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');

    await service.handleWebhook(PAYLOAD, SIGNATURE);

    expect(repository.upsertSubscription).toHaveBeenCalledWith('user-1', {
      stripeSubscriptionId: 'sub_1',
      tier: DbSubscriptionTier.ESSENTIAL,
      status: DbSubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(1_800_000_000 * 1000),
      cancelAtPeriodEnd: false,
    });
  });

  it('stores a deleted subscription as canceled', async () => {
    stubEvent(
      'customer.subscription.deleted',
      buildStripeSubscription({ status: 'canceled' }),
    );
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');

    await service.handleWebhook(PAYLOAD, SIGNATURE);

    expect(repository.upsertSubscription).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ status: DbSubscriptionStatus.CANCELED }),
    );
  });

  it('resolves the user through the checkout client reference', async () => {
    stubEvent('checkout.session.completed', {
      mode: 'subscription',
      subscription: buildStripeSubscription(),
      client_reference_id: 'user-42',
    });

    await service.handleWebhook(PAYLOAD, SIGNATURE);

    expect(repository.upsertSubscription).toHaveBeenCalledWith(
      'user-42',
      expect.objectContaining({ tier: DbSubscriptionTier.ESSENTIAL }),
    );
  });

  it('ignores unknown events silently', async () => {
    stubEvent('invoice.paid', {});

    await service.handleWebhook(PAYLOAD, SIGNATURE);

    expect(repository.upsertSubscription).not.toHaveBeenCalled();
  });

  it('ignores an unknown stripe customer', async () => {
    stubEvent('customer.subscription.updated', buildStripeSubscription());
    repository.findUserIdByStripeCustomerId.mockResolvedValue(null);

    await service.handleWebhook(PAYLOAD, SIGNATURE);

    expect(repository.upsertSubscription).not.toHaveBeenCalled();
  });
});
