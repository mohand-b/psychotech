import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
    publishableKey: 'pk_test_x',
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
    metadata: {},
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
const createStripeSubscription = vi.fn();
const listStripeSubscriptions = vi.fn();
const cancelStripeSubscription = vi.fn();
const retrieveStripeSubscription = vi.fn();
const updateStripeSubscription = vi.fn();
const createSetupIntent = vi.fn();
const updateStripeCustomer = vi.fn();
const createInvoicePreview = vi.fn();
const retrieveStripePrice = vi.fn();
const stripe = {
  webhooks: { constructEvent },
  subscriptions: {
    create: createStripeSubscription,
    list: listStripeSubscriptions,
    cancel: cancelStripeSubscription,
    retrieve: retrieveStripeSubscription,
    update: updateStripeSubscription,
  },
  setupIntents: { create: createSetupIntent },
  customers: { update: updateStripeCustomer },
  invoices: { createPreview: createInvoicePreview },
  prices: { retrieve: retrieveStripePrice },
  promotionCodes: { list: listPromotionCodes },
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
  listStripeSubscriptions.mockResolvedValue({ data: [] });
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

describe('BillingService.createSubscription', () => {
  const user = {
    id: 'user-1',
    email: 'a@b.c',
    firstName: 'A',
    lastName: 'B',
    stripeCustomerId: 'cus_1',
  };

  it('creates an incomplete subscription and returns the payment secret', async () => {
    repository.findUserById.mockResolvedValue(user);
    createStripeSubscription.mockResolvedValue({
      id: 'sub_1',
      pending_setup_intent: null,
      latest_invoice: {
        confirmation_secret: { client_secret: 'pi_secret_1' },
      },
    });

    const payment = await service.createSubscription(
      'user-1',
      SubscriptionTier.ESSENTIAL,
    );

    expect(payment).toEqual({
      clientSecret: 'pi_secret_1',
      kind: 'PAYMENT',
    });
    expect(createStripeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_1',
        payment_behavior: 'default_incomplete',
        items: [{ price: 'price_essential' }],
        metadata: { userId: 'user-1' },
      }),
    );
  });

  it('returns the setup secret when the first invoice is fully discounted', async () => {
    repository.findUserById.mockResolvedValue(user);
    listPromotionCodes.mockResolvedValue({ data: [buildStripePromotion()] });
    createStripeSubscription.mockResolvedValue({
      id: 'sub_1',
      pending_setup_intent: { client_secret: 'seti_secret_1' },
      latest_invoice: null,
    });

    const payment = await service.createSubscription(
      'user-1',
      SubscriptionTier.UNLIMITED,
      'PSYCHO20',
    );

    expect(payment).toEqual({
      clientSecret: 'seti_secret_1',
      kind: 'SETUP',
    });
    expect(createStripeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        discounts: [{ promotion_code: 'promo_1' }],
      }),
    );
  });

  it('cancels previous incomplete subscriptions before creating a new one', async () => {
    repository.findUserById.mockResolvedValue(user);
    listStripeSubscriptions.mockResolvedValue({
      data: [{ id: 'sub_old' }],
    });
    createStripeSubscription.mockResolvedValue({
      id: 'sub_1',
      pending_setup_intent: null,
      latest_invoice: {
        confirmation_secret: { client_secret: 'pi_secret_1' },
      },
    });

    await service.createSubscription('user-1', SubscriptionTier.ESSENTIAL);

    expect(cancelStripeSubscription).toHaveBeenCalledWith('sub_old');
  });

  it('rejects an unknown promotion code before creating the subscription', async () => {
    repository.findUserById.mockResolvedValue(user);
    listPromotionCodes.mockResolvedValue({ data: [] });

    await expect(
      service.createSubscription('user-1', SubscriptionTier.ESSENTIAL, 'NOPE'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createStripeSubscription).not.toHaveBeenCalled();
  });
});

describe('BillingService.changeSubscriptionPlan', () => {
  const dbRow = {
    id: 'row-1',
    userId: 'user-1',
    tier: DbSubscriptionTier.ESSENTIAL,
    status: DbSubscriptionStatus.ACTIVE,
    billingPeriod: 'MONTHLY',
    currentPeriodEnd: new Date('2026-08-17T00:00:00Z'),
    cancelAtPeriodEnd: false,
    stripeSubscriptionId: 'sub_1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('upgrades immediately with prorations', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(dbRow);
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({
        status: 'active',
        items: {
          data: [
            { id: 'si_1', price: { id: 'price_essential' }, current_period_end: 1_800_000_000 },
          ],
        },
      }),
    );
    updateStripeSubscription.mockResolvedValue(
      buildStripeSubscription({
        items: {
          data: [
            { id: 'si_1', price: { id: 'price_unlimited' }, current_period_end: 1_800_000_000 },
          ],
        },
      }),
    );
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');

    await service.changeSubscriptionPlan('user-1', SubscriptionTier.UNLIMITED);

    expect(updateStripeSubscription).toHaveBeenCalledWith('sub_1', {
      items: [{ id: 'si_1', price: 'price_unlimited' }],
      proration_behavior: 'always_invoice',
      payment_behavior: 'error_if_incomplete',
    });
    expect(repository.upsertSubscription).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ tier: DbSubscriptionTier.UNLIMITED }),
    );
  });

  it('rejects the upgrade when the immediate proration payment is declined', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(dbRow);
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({
        status: 'active',
        items: {
          data: [
            { id: 'si_1', price: { id: 'price_essential' }, current_period_end: 1_800_000_000 },
          ],
        },
      }),
    );
    const declined = new Stripe.errors.StripeCardError({
      type: 'card_error',
      message: 'Your card was declined.',
    } as never);
    declined.statusCode = 402;
    updateStripeSubscription.mockRejectedValue(declined);

    await expect(
      service.changeSubscriptionPlan('user-1', SubscriptionTier.UNLIMITED),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.upsertSubscription).not.toHaveBeenCalled();
  });

  it('downgrades without prorations', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(dbRow);
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({
        status: 'active',
        items: {
          data: [
            { id: 'si_1', price: { id: 'price_unlimited' }, current_period_end: 1_800_000_000 },
          ],
        },
      }),
    );
    updateStripeSubscription.mockResolvedValue(buildStripeSubscription({}));
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');

    await service.changeSubscriptionPlan('user-1', SubscriptionTier.ESSENTIAL);

    expect(updateStripeSubscription).toHaveBeenCalledWith(
      'sub_1',
      expect.objectContaining({ proration_behavior: 'none' }),
    );
  });

  it('does not call stripe update when the plan is unchanged', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(dbRow);
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({ status: 'active' }),
    );

    await service.changeSubscriptionPlan('user-1', SubscriptionTier.ESSENTIAL);

    expect(updateStripeSubscription).not.toHaveBeenCalled();
  });

  it('refuses without a stripe subscription', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue({
      ...dbRow,
      stripeSubscriptionId: null,
    });

    await expect(
      service.changeSubscriptionPlan('user-1', SubscriptionTier.UNLIMITED),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('BillingService.previewPlanChange', () => {
  const dbRow = {
    id: 'row-1',
    userId: 'user-1',
    tier: DbSubscriptionTier.ESSENTIAL,
    status: DbSubscriptionStatus.ACTIVE,
    billingPeriod: 'MONTHLY',
    currentPeriodEnd: new Date('2026-08-17T00:00:00Z'),
    cancelAtPeriodEnd: false,
    stripeSubscriptionId: 'sub_1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('previews an upgrade with the prorated difference', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(dbRow);
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({ status: 'active' }),
    );
    createInvoicePreview.mockResolvedValue({ total: 1909 });
    retrieveStripePrice.mockResolvedValue({ unit_amount: 1499 });

    const preview = await service.previewPlanChange(
      'user-1',
      SubscriptionTier.UNLIMITED,
    );

    expect(preview).toEqual({
      currentPlan: SubscriptionTier.ESSENTIAL,
      targetPlan: SubscriptionTier.UNLIMITED,
      monthlyAmount: 1499,
      prorationAmount: 410,
      nextInvoiceTotal: 1909,
      nextInvoiceDate: new Date(1_800_000_000 * 1000).toISOString(),
    });
    expect(createInvoicePreview).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription: 'sub_1',
        subscription_details: expect.objectContaining({
          proration_behavior: 'create_prorations',
        }),
      }),
    );
  });

  it('previews a downgrade without proration', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(dbRow);
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({
        status: 'active',
        items: {
          data: [
            { id: 'si_1', price: { id: 'price_unlimited' }, current_period_end: 1_800_000_000 },
          ],
        },
      }),
    );
    createInvoicePreview.mockResolvedValue({ total: 899 });
    retrieveStripePrice.mockResolvedValue({ unit_amount: 899 });

    const preview = await service.previewPlanChange(
      'user-1',
      SubscriptionTier.ESSENTIAL,
    );

    expect(preview.prorationAmount).toBe(0);
    expect(preview.nextInvoiceTotal).toBe(899);
    expect(createInvoicePreview).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_details: expect.objectContaining({
          proration_behavior: 'none',
        }),
      }),
    );
  });

  it('rejects a preview for the current plan', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(dbRow);
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({ status: 'active' }),
    );

    await expect(
      service.previewPlanChange('user-1', SubscriptionTier.ESSENTIAL),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('BillingService cancel and resume', () => {
  const dbRow = {
    id: 'row-1',
    userId: 'user-1',
    tier: DbSubscriptionTier.ESSENTIAL,
    status: DbSubscriptionStatus.ACTIVE,
    billingPeriod: 'MONTHLY',
    currentPeriodEnd: new Date('2026-08-17T00:00:00Z'),
    cancelAtPeriodEnd: false,
    stripeSubscriptionId: 'sub_1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('schedules the cancellation at period end', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(dbRow);
    updateStripeSubscription.mockResolvedValue(
      buildStripeSubscription({ cancel_at_period_end: true }),
    );
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');

    await service.cancelSubscription('user-1');

    expect(updateStripeSubscription).toHaveBeenCalledWith('sub_1', {
      cancel_at_period_end: true,
    });
    expect(repository.upsertSubscription).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ cancelAtPeriodEnd: true }),
    );
  });

  it('resumes a scheduled cancellation', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue({
      ...dbRow,
      cancelAtPeriodEnd: true,
    });
    updateStripeSubscription.mockResolvedValue(buildStripeSubscription({}));
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');

    await service.resumeSubscription('user-1');

    expect(updateStripeSubscription).toHaveBeenCalledWith('sub_1', {
      cancel_at_period_end: false,
    });
  });

  it('refuses without a stripe subscription', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(null);

    await expect(service.cancelSubscription('user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('BillingService.createPaymentMethodSetup', () => {
  it('creates a setup intent for the customer', async () => {
    repository.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.c',
      firstName: 'A',
      lastName: 'B',
      stripeCustomerId: 'cus_1',
    });
    createSetupIntent.mockResolvedValue({ client_secret: 'seti_secret' });

    const payment = await service.createPaymentMethodSetup('user-1');

    expect(payment).toEqual({ clientSecret: 'seti_secret', kind: 'SETUP' });
    expect(createSetupIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_1',
        metadata: { userId: 'user-1', purpose: 'payment_method_update' },
      }),
    );
  });
});

describe('BillingService.handleWebhook payment method update', () => {
  it('sets the new card as default on the customer and the subscription', async () => {
    stubEvent('setup_intent.succeeded', {
      customer: 'cus_1',
      payment_method: 'pm_new',
      metadata: { userId: 'user-1', purpose: 'payment_method_update' },
    });
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');
    repository.findSubscriptionByUserId.mockResolvedValue({
      stripeSubscriptionId: 'sub_1',
      status: DbSubscriptionStatus.ACTIVE,
    });

    await service.handleWebhook(PAYLOAD, SIGNATURE);

    expect(updateStripeCustomer).toHaveBeenCalledWith('cus_1', {
      invoice_settings: { default_payment_method: 'pm_new' },
    });
    expect(updateStripeSubscription).toHaveBeenCalledWith('sub_1', {
      default_payment_method: 'pm_new',
    });
  });

  it('ignores setup intents without the update purpose', async () => {
    stubEvent('setup_intent.succeeded', {
      customer: 'cus_1',
      payment_method: 'pm_new',
      metadata: {},
    });

    await service.handleWebhook(PAYLOAD, SIGNATURE);

    expect(updateStripeCustomer).not.toHaveBeenCalled();
  });
});

describe('BillingService.getBillingConfig', () => {
  it('returns the publishable key', () => {
    expect(service.getBillingConfig()).toEqual({
      publishableKey: 'pk_test_x',
    });
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

  it('resolves the user through the subscription metadata', async () => {
    stubEvent(
      'customer.subscription.updated',
      buildStripeSubscription({ metadata: { userId: 'user-42' } }),
    );
    repository.findUserIdByStripeCustomerId.mockResolvedValue(null);

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
