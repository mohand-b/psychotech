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
import { SubscriptionStatus, SubscriptionTier } from '@psychotech/shared';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EnergyService } from '../energy/energy.service';
import { TierResolutionService } from '../subscriptions/tier-resolution.service';
import { BillingRepository } from './billing.repository';
import { BillingService } from './billing.service';

const WEBHOOK_SECRET = 'whsec_test';

const configService = {
  getOrThrow: (key: string) =>
    key === 'CORS_ORIGIN'
      ? 'http://localhost:4200'
      : {
          enabled: true,
          secretKey: 'sk_test_x',
          publishableKey: 'pk_test_x',
          webhookSecret: WEBHOOK_SECRET,
          priceEssential: 'price_essential',
          priceUnlimited: 'price_unlimited',
          priceEnergyPack: 'price_energy_pack',
        },
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
    schedule: null,
    cancel_at: null,
    canceled_at: null,
    items: {
      data: [
        {
          price: { id: 'price_essential', unit_amount: 899 },
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
const createStripeCustomer = vi.fn();
const updateStripeCustomer = vi.fn();
const retrieveStripeCustomer = vi.fn();
const createInvoicePreview = vi.fn();
const listStripeInvoices = vi.fn();
const retrieveStripePrice = vi.fn();
const createStripeSchedule = vi.fn();
const updateStripeSchedule = vi.fn();
const releaseStripeSchedule = vi.fn();
const retrieveStripeSchedule = vi.fn();
const createPaymentIntent = vi.fn();
const stripe = {
  webhooks: { constructEvent },
  subscriptions: {
    create: createStripeSubscription,
    list: listStripeSubscriptions,
    cancel: cancelStripeSubscription,
    retrieve: retrieveStripeSubscription,
    update: updateStripeSubscription,
  },
  subscriptionSchedules: {
    create: createStripeSchedule,
    update: updateStripeSchedule,
    release: releaseStripeSchedule,
    retrieve: retrieveStripeSchedule,
  },
  setupIntents: { create: createSetupIntent },
  customers: {
    create: createStripeCustomer,
    update: updateStripeCustomer,
    retrieve: retrieveStripeCustomer,
  },
  invoices: { createPreview: createInvoicePreview, list: listStripeInvoices },
  prices: { retrieve: retrieveStripePrice },
  promotionCodes: { list: listPromotionCodes },
  paymentIntents: { create: createPaymentIntent },
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

const energyService = {
  getState: vi.fn(),
  creditPurchasedRefill: vi.fn(),
};

const tierResolution = new TierResolutionService(configService);

const service = new BillingService(
  stripe,
  repository as unknown as BillingRepository,
  energyService as unknown as EnergyService,
  configService,
  tierResolution,
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
  retrieveStripeCustomer.mockResolvedValue({
    id: 'cus_1',
    deleted: false,
    invoice_settings: { default_payment_method: null },
  });
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

  it('recreates the customer when the stored one is missing in this stripe environment', async () => {
    repository.findUserById.mockResolvedValue(user);
    retrieveStripeCustomer.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        message: "No such customer: 'cus_1'",
        code: 'resource_missing',
        type: 'invalid_request_error',
      }),
    );
    createStripeCustomer.mockResolvedValue({ id: 'cus_new' });
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

    expect(payment).toEqual({ clientSecret: 'pi_secret_1', kind: 'PAYMENT' });
    expect(createStripeCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.c', metadata: { userId: 'user-1' } }),
    );
    expect(repository.saveStripeCustomerId).toHaveBeenCalledWith(
      'user-1',
      'cus_new',
    );
    expect(createStripeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_new' }),
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
      cancel_at_period_end: false,
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
    updateStripeSubscription.mockRejectedValueOnce(declined);

    await expect(
      service.changeSubscriptionPlan('user-1', SubscriptionTier.UNLIMITED),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.upsertSubscription).not.toHaveBeenCalled();
  });

  it('schedules the downgrade for the end of the paid period', async () => {
    const unlimited = buildStripeSubscription({
      status: 'active',
      items: {
        data: [
          { id: 'si_1', price: { id: 'price_unlimited' }, current_period_end: 1_800_000_000 },
        ],
      },
    });
    repository.findSubscriptionByUserId.mockResolvedValue(dbRow);
    retrieveStripeSubscription
      .mockResolvedValueOnce(unlimited)
      .mockResolvedValueOnce(
        buildStripeSubscription({
          status: 'active',
          schedule: 'sched_1',
          items: unlimited.items,
        }),
      );
    createStripeSchedule.mockResolvedValue({
      id: 'sched_1',
      phases: [{ start_date: 1_797_000_000 }],
    });
    retrieveStripeSchedule.mockResolvedValue({
      phases: [
        { items: [{ price: 'price_unlimited' }] },
        { items: [{ price: 'price_essential' }] },
      ],
    });
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');

    await service.changeSubscriptionPlan('user-1', SubscriptionTier.ESSENTIAL);

    expect(updateStripeSubscription).not.toHaveBeenCalled();
    expect(createStripeSchedule).toHaveBeenCalledWith({
      from_subscription: 'sub_1',
    });
    expect(updateStripeSchedule).toHaveBeenCalledWith('sched_1', {
      end_behavior: 'release',
      phases: [
        {
          items: [{ price: 'price_unlimited', quantity: 1 }],
          start_date: 1_797_000_000,
          end_date: 1_800_000_000,
        },
        { items: [{ price: 'price_essential', quantity: 1 }] },
      ],
    });
    expect(repository.upsertSubscription).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        tier: DbSubscriptionTier.UNLIMITED,
        pendingTier: DbSubscriptionTier.ESSENTIAL,
      }),
    );
  });

  it('cancels a scheduled plan change by releasing the schedule', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(dbRow);
    retrieveStripeSubscription
      .mockResolvedValueOnce(
        buildStripeSubscription({ status: 'active', schedule: 'sched_1' }),
      )
      .mockResolvedValueOnce(buildStripeSubscription({ status: 'active' }));
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');

    await service.cancelPlanChange('user-1');

    expect(releaseStripeSchedule).toHaveBeenCalledWith('sched_1');
    expect(repository.upsertSubscription).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ pendingTier: null }),
    );
  });

  it('lifts a scheduled cancellation before scheduling the downgrade', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(dbRow);
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({
        status: 'active',
        cancel_at_period_end: true,
        items: {
          data: [
            { id: 'si_1', price: { id: 'price_unlimited' }, current_period_end: 1_800_000_000 },
          ],
        },
      }),
    );
    createStripeSchedule.mockResolvedValue({
      id: 'sched_1',
      phases: [{ start_date: 1_797_000_000 }],
    });
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');

    await service.changeSubscriptionPlan('user-1', SubscriptionTier.ESSENTIAL);

    expect(updateStripeSubscription).toHaveBeenCalledWith('sub_1', {
      cancel_at_period_end: false,
    });
    expect(createStripeSchedule).toHaveBeenCalled();
  });

  it('releases an existing schedule before applying a new change', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(dbRow);
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({
        status: 'active',
        schedule: 'sched_old',
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

    expect(releaseStripeSchedule).toHaveBeenCalledWith('sched_old');
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
    createInvoicePreview.mockResolvedValue({
      total: 1909,
      lines: {
        data: [
          {
            amount: 1499,
            parent: { subscription_item_details: { proration: false } },
          },
          {
            amount: 810,
            parent: { subscription_item_details: { proration: true } },
          },
          {
            amount: -400,
            parent: { subscription_item_details: { proration: true } },
          },
        ],
      },
    });
    retrieveStripePrice.mockResolvedValue({ unit_amount: 1499 });

    const preview = await service.previewPlanChange(
      'user-1',
      SubscriptionTier.UNLIMITED,
    );

    expect(preview).toMatchObject({
      currentPlan: SubscriptionTier.ESSENTIAL,
      targetPlan: SubscriptionTier.UNLIMITED,
      monthlyAmount: 1499,
      prorationAmount: 410,
      prorationCharge: 810,
      prorationCredit: 400,
      nextInvoiceTotal: 1909,
      nextInvoiceDate: new Date(1_800_000_000 * 1000).toISOString(),
      card: null,
    });
    expect(createInvoicePreview).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription: 'sub_1',
        subscription_details: expect.objectContaining({
          proration_behavior: 'create_prorations',
          cancel_at_period_end: false,
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
    createInvoicePreview.mockResolvedValue({
      total: 899,
      lines: { data: [] },
    });
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
          cancel_at_period_end: false,
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

  it('rejects a preview for an already scheduled plan change', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue({
      ...dbRow,
      tier: DbSubscriptionTier.UNLIMITED,
      pendingTier: DbSubscriptionTier.ESSENTIAL,
    });
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

    await expect(
      service.previewPlanChange('user-1', SubscriptionTier.ESSENTIAL),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createInvoicePreview).not.toHaveBeenCalled();
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
    retrieveStripeSubscription.mockResolvedValue(buildStripeSubscription());
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

  it('releases a pending downgrade schedule when cancelling', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(dbRow);
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({ schedule: 'sched_1' }),
    );
    updateStripeSubscription.mockResolvedValue(
      buildStripeSubscription({ cancel_at_period_end: true }),
    );
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');

    await service.cancelSubscription('user-1');

    expect(releaseStripeSchedule).toHaveBeenCalledWith('sched_1');
  });

  it('resumes a scheduled cancellation', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue({
      ...dbRow,
      cancelAtPeriodEnd: true,
    });
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({ cancel_at_period_end: true }),
    );
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

describe('BillingService.listInvoices', () => {
  it('returns an empty list without stripe configured', async () => {
    const offlineService = new BillingService(
      null,
      repository as unknown as BillingRepository,
      energyService as unknown as EnergyService,
      configService,
      tierResolution,
    );

    await expect(offlineService.listInvoices('user-1')).resolves.toEqual([]);
    expect(repository.findUserById).not.toHaveBeenCalled();
  });

  it('returns an empty list without a stripe customer', async () => {
    repository.findUserById.mockResolvedValue({
      id: 'user-1',
      stripeCustomerId: null,
    });

    await expect(service.listInvoices('user-1')).resolves.toEqual([]);
    expect(listStripeInvoices).not.toHaveBeenCalled();
  });

  it('maps stripe invoices onto the shared dto and drops drafts', async () => {
    repository.findUserById.mockResolvedValue({
      id: 'user-1',
      stripeCustomerId: 'cus_1',
    });
    listStripeInvoices.mockResolvedValue({
      data: [
        {
          id: 'in_1',
          created: 1_754_000_000,
          total: 1499,
          status: 'paid',
          hosted_invoice_url: 'https://invoice.stripe.com/in_1',
          invoice_pdf: 'https://files.stripe.com/in_1.pdf',
          lines: {
            data: [
              { pricing: { price_details: { price: 'price_unlimited' } } },
            ],
          },
        },
        {
          id: 'in_2',
          created: 1_751_000_000,
          total: 899,
          status: 'open',
          hosted_invoice_url: 'https://invoice.stripe.com/in_2',
          invoice_pdf: null,
          lines: { data: [{ pricing: { price_details: { price: 'price_essential' } } }] },
        },
        {
          id: 'in_3',
          created: 1_750_000_000,
          total: 899,
          status: 'draft',
          hosted_invoice_url: null,
          invoice_pdf: null,
          lines: { data: [] },
        },
      ],
    });

    const invoices = await service.listInvoices('user-1');

    expect(listStripeInvoices).toHaveBeenCalledWith({
      customer: 'cus_1',
      limit: 24,
    });
    expect(invoices).toEqual([
      {
        id: 'in_1',
        createdAt: new Date(1_754_000_000 * 1000).toISOString(),
        tier: SubscriptionTier.UNLIMITED,
        amount: 1499,
        status: 'PAID',
        url: 'https://files.stripe.com/in_1.pdf',
      },
      {
        id: 'in_2',
        createdAt: new Date(1_751_000_000 * 1000).toISOString(),
        tier: SubscriptionTier.ESSENTIAL,
        amount: 899,
        status: 'OPEN',
        url: 'https://invoice.stripe.com/in_2',
      },
    ]);
  });

  it('returns an empty list when the stripe customer no longer exists', async () => {
    repository.findUserById.mockResolvedValue({
      id: 'user-1',
      stripeCustomerId: 'cus_gone',
    });
    listStripeInvoices.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        type: 'invalid_request_error',
        code: 'resource_missing',
        message: 'No such customer',
      } as Stripe.StripeRawError),
    );

    await expect(service.listInvoices('user-1')).resolves.toEqual([]);
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
      canceledAt: null,
      pendingTier: null,
    });
  });

  it('persists the scheduled cancellation state on every update event', async () => {
    stubEvent(
      'customer.subscription.updated',
      buildStripeSubscription({
        cancel_at_period_end: true,
        canceled_at: 1_790_000_000,
      }),
    );
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');

    await service.handleWebhook(PAYLOAD, SIGNATURE);

    expect(repository.upsertSubscription).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        cancelAtPeriodEnd: true,
        canceledAt: new Date(1_790_000_000 * 1000),
        status: DbSubscriptionStatus.ACTIVE,
      }),
    );
  });

  it('captures a portal cancellation expressed through cancel_at only', async () => {
    stubEvent(
      'customer.subscription.updated',
      buildStripeSubscription({
        cancel_at_period_end: false,
        cancel_at: 1_798_000_000,
        canceled_at: 1_790_000_000,
      }),
    );
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');

    await service.handleWebhook(PAYLOAD, SIGNATURE);

    expect(repository.upsertSubscription).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        cancelAtPeriodEnd: true,
        canceledAt: new Date(1_790_000_000 * 1000),
      }),
    );
  });

  it('follows a plan change made in the portal through the price', async () => {
    stubEvent(
      'customer.subscription.updated',
      buildStripeSubscription({
        items: {
          data: [
            {
              price: { id: 'price_unlimited', unit_amount: 1499 },
              current_period_end: 1_800_000_000,
            },
          ],
        },
      }),
    );
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');

    await service.handleWebhook(PAYLOAD, SIGNATURE);

    expect(repository.upsertSubscription).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ tier: DbSubscriptionTier.UNLIMITED }),
    );
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

function buildEssentialRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row-1',
    userId: 'user-1',
    tier: DbSubscriptionTier.ESSENTIAL,
    status: DbSubscriptionStatus.ACTIVE,
    billingPeriod: 'MONTHLY',
    currentPeriodEnd: new Date('2026-08-17T00:00:00Z'),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    pendingTier: null,
    stripeSubscriptionId: 'sub_1',
    ...overrides,
  };
}

describe('BillingService.createEnergyRefillPayment', () => {
  beforeEach(() => {
    repository.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Alice',
      lastName: 'Martin',
      stripeCustomerId: 'cus_1',
    });
    retrieveStripePrice.mockResolvedValue({
      id: 'price_energy_pack',
      unit_amount: 100,
      currency: 'eur',
    });
  });

  it('charges the saved card off-session for one euro', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(buildEssentialRow());
    energyService.getState.mockResolvedValue({ balance: 2, capacity: 5 });
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({ default_payment_method: 'pm_1' }),
    );
    createPaymentIntent.mockResolvedValue({ id: 'pi_1', status: 'succeeded' });

    await service.createEnergyRefillPayment('user-1');

    expect(createPaymentIntent).toHaveBeenCalledWith({
      amount: 100,
      currency: 'eur',
      customer: 'cus_1',
      payment_method: 'pm_1',
      off_session: true,
      confirm: true,
      description: "Recharge d'énergie",
      metadata: { userId: 'user-1', purpose: 'energy_refill' },
    });
  });

  it('refuses tiers other than essential', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(
      buildEssentialRow({ tier: DbSubscriptionTier.UNLIMITED }),
    );

    await expect(
      service.createEnergyRefillPayment('user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    repository.findSubscriptionByUserId.mockResolvedValue(null);
    await expect(
      service.createEnergyRefillPayment('user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(createPaymentIntent).not.toHaveBeenCalled();
  });

  it('refuses a refill when the balance is already full', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(buildEssentialRow());
    energyService.getState.mockResolvedValue({ balance: 5, capacity: 5 });

    await expect(
      service.createEnergyRefillPayment('user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createPaymentIntent).not.toHaveBeenCalled();
  });

  it('surfaces a missing default payment method as a typed error', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(buildEssentialRow());
    energyService.getState.mockResolvedValue({ balance: 2, capacity: 5 });
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({ default_payment_method: null }),
    );
    retrieveStripeCustomer.mockResolvedValue({
      id: 'cus_1',
      deleted: false,
      invoice_settings: { default_payment_method: null },
    });

    const rejection = service.createEnergyRefillPayment('user-1');
    await expect(rejection).rejects.toBeInstanceOf(BadRequestException);
    await rejection.catch((error: BadRequestException) => {
      expect(error.message).toBe('ENERGY_NO_PAYMENT_METHOD');
    });
  });

  it('maps a declined card onto the typed payment error', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(buildEssentialRow());
    energyService.getState.mockResolvedValue({ balance: 2, capacity: 5 });
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({ default_payment_method: 'pm_1' }),
    );
    createPaymentIntent.mockRejectedValue(
      new Stripe.errors.StripeCardError({
        type: 'card_error',
        message: 'Your card was declined.',
        code: 'card_declined',
      } as Stripe.StripeRawError),
    );

    const rejection = service.createEnergyRefillPayment('user-1');
    await expect(rejection).rejects.toBeInstanceOf(BadRequestException);
    await rejection.catch((error: BadRequestException) => {
      expect(error.message).toBe('ENERGY_PAYMENT_DECLINED');
    });
  });
});

describe('BillingService.handleWebhook energy refill', () => {
  function buildIntent(overrides: Record<string, unknown> = {}) {
    return {
      id: 'pi_1',
      object: 'payment_intent',
      metadata: { userId: 'user-1', purpose: 'energy_refill' },
      ...overrides,
    };
  }

  it('credits the purchased refill exactly once for a replayed event', async () => {
    stubEvent('payment_intent.succeeded', buildIntent());
    repository.registerEvent
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await service.handleWebhook(PAYLOAD, SIGNATURE);
    await service.handleWebhook(PAYLOAD, SIGNATURE);

    expect(energyService.creditPurchasedRefill).toHaveBeenCalledTimes(1);
    expect(energyService.creditPurchasedRefill).toHaveBeenCalledWith(
      'user-1',
      'pi_1',
    );
  });

  it('ignores payment intents that are not energy refills', async () => {
    stubEvent(
      'payment_intent.succeeded',
      buildIntent({ metadata: { purpose: 'payment_method_update' } }),
    );
    await service.handleWebhook(PAYLOAD, SIGNATURE);

    stubEvent('payment_intent.succeeded', buildIntent({ metadata: {} }), 'evt_2');
    await service.handleWebhook(PAYLOAD, SIGNATURE);

    expect(energyService.creditPurchasedRefill).not.toHaveBeenCalled();
    expect(repository.upsertSubscription).not.toHaveBeenCalled();
  });
});

describe('BillingService.getBillingOverview', () => {
  it('returns the discovery state without a subscription row', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(null);

    const overview = await service.getBillingOverview('user-1', false);

    expect(overview).toEqual({
      tier: SubscriptionTier.FREE,
      status: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      currentPeriodEnd: null,
      pendingTier: null,
      monthlyAmount: null,
      paymentMethod: null,
      nextInvoiceDate: null,
    });
    expect(retrieveStripeSubscription).not.toHaveBeenCalled();
  });

  it('describes an active subscription with price, card and next invoice date', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(buildEssentialRow());
    repository.findUserById.mockResolvedValue({
      id: 'user-1',
      stripeCustomerId: 'cus_1',
    });
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({
        default_payment_method: {
          id: 'pm_1',
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 4,
            exp_year: 2030,
            wallet: null,
          },
        },
      }),
    );

    const overview = await service.getBillingOverview('user-1', false);

    expect(overview).toMatchObject({
      tier: SubscriptionTier.ESSENTIAL,
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
      monthlyAmount: 899,
      paymentMethod: expect.objectContaining({ brand: 'visa', last4: '4242' }),
      nextInvoiceDate: new Date('2026-08-17T00:00:00Z').toISOString(),
    });
  });

  it('hides the next invoice date once the cancellation is scheduled', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(
      buildEssentialRow({
        cancelAtPeriodEnd: true,
        canceledAt: new Date('2026-07-20T10:00:00Z'),
      }),
    );
    repository.findUserById.mockResolvedValue({
      id: 'user-1',
      stripeCustomerId: 'cus_1',
    });
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({ cancel_at_period_end: true }),
    );

    const overview = await service.getBillingOverview('user-1', false);

    expect(overview).toMatchObject({
      tier: SubscriptionTier.ESSENTIAL,
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: true,
      canceledAt: new Date('2026-07-20T10:00:00Z').toISOString(),
      currentPeriodEnd: new Date('2026-08-17T00:00:00Z').toISOString(),
      nextInvoiceDate: null,
    });
  });

  it('keeps access while past due without a next invoice date', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(
      buildEssentialRow({ status: DbSubscriptionStatus.PAST_DUE }),
    );
    repository.findUserById.mockResolvedValue({
      id: 'user-1',
      stripeCustomerId: 'cus_1',
    });
    retrieveStripeSubscription.mockResolvedValue(buildStripeSubscription());

    const overview = await service.getBillingOverview('user-1', false);

    expect(overview).toMatchObject({
      tier: SubscriptionTier.ESSENTIAL,
      status: SubscriptionStatus.PAST_DUE,
      nextInvoiceDate: null,
    });
    expect(retrieveStripeSubscription).toHaveBeenCalled();
  });

  it('falls back to discovery once the subscription is canceled', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(
      buildEssentialRow({
        status: DbSubscriptionStatus.CANCELED,
        canceledAt: new Date('2026-07-20T10:00:00Z'),
      }),
    );

    const overview = await service.getBillingOverview('user-1', false);

    expect(overview).toMatchObject({
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.CANCELED,
      monthlyAmount: null,
      paymentMethod: null,
      nextInvoiceDate: null,
    });
    expect(retrieveStripeSubscription).not.toHaveBeenCalled();
  });

  it('treats an incomplete subscription as no subscription', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(
      buildEssentialRow({ status: DbSubscriptionStatus.EXPIRED }),
    );

    const overview = await service.getBillingOverview('user-1', false);

    expect(overview.tier).toBe(SubscriptionTier.FREE);
    expect(overview.status).toBe(SubscriptionStatus.EXPIRED);
    expect(retrieveStripeSubscription).not.toHaveBeenCalled();
  });
});

describe('BillingService.getBillingOverview reconciliation', () => {
  it('realigns the base from stripe when asked to reconcile', async () => {
    const staleRow = buildEssentialRow();
    const repairedRow = buildEssentialRow({
      cancelAtPeriodEnd: true,
      canceledAt: new Date(1_790_000_000 * 1000),
    });
    repository.findSubscriptionByUserId
      .mockResolvedValueOnce(staleRow)
      .mockResolvedValue(repairedRow);
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');
    repository.findUserById.mockResolvedValue({
      id: 'user-1',
      stripeCustomerId: 'cus_1',
    });
    retrieveStripeSubscription.mockResolvedValue(
      buildStripeSubscription({
        cancel_at_period_end: true,
        canceled_at: 1_790_000_000,
      }),
    );

    const overview = await service.getBillingOverview('user-1', true);

    expect(repository.upsertSubscription).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        cancelAtPeriodEnd: true,
        canceledAt: new Date(1_790_000_000 * 1000),
      }),
    );
    expect(overview.cancelAtPeriodEnd).toBe(true);
    expect(overview.nextInvoiceDate).toBeNull();
  });

  it('leaves an aligned subscription untouched by reconciliation', async () => {
    repository.findSubscriptionByUserId.mockResolvedValue(buildEssentialRow());
    repository.findUserIdByStripeCustomerId.mockResolvedValue('user-1');
    repository.findUserById.mockResolvedValue({
      id: 'user-1',
      stripeCustomerId: 'cus_1',
    });
    retrieveStripeSubscription.mockResolvedValue(buildStripeSubscription());

    const overview = await service.getBillingOverview('user-1', true);

    expect(repository.upsertSubscription).toHaveBeenCalledWith('user-1', {
      stripeSubscriptionId: 'sub_1',
      tier: DbSubscriptionTier.ESSENTIAL,
      status: DbSubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(1_800_000_000 * 1000),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      pendingTier: null,
    });
    expect(overview.tier).toBe(SubscriptionTier.ESSENTIAL);
  });

  it('marks the subscription canceled when stripe no longer knows it', async () => {
    repository.findSubscriptionByUserId
      .mockResolvedValueOnce(buildEssentialRow())
      .mockResolvedValue(
        buildEssentialRow({ status: DbSubscriptionStatus.CANCELED }),
      );
    retrieveStripeSubscription.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        type: 'invalid_request_error',
        code: 'resource_missing',
        message: 'No such subscription',
      } as Stripe.StripeRawError),
    );

    const overview = await service.getBillingOverview('user-1', true);

    expect(repository.upsertSubscription).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        status: DbSubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: false,
        pendingTier: null,
      }),
    );
    expect(overview.tier).toBe(SubscriptionTier.FREE);
  });
});
