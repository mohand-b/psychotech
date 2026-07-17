import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  BillingConfigDto,
  ChangePlanPreviewDto,
  PaidTier,
  PaymentIntentKind,
  PromotionCodeDto,
  SubscriptionDto,
  SubscriptionPaymentDto,
  SubscriptionTier,
} from '@psychotech/shared';
import { toSubscriptionDto } from '../subscriptions/subscription.mappers';
import { BillingConfig } from '../config/billing.config';
import {
  mapStripeSubscriptionStatus,
  PriceCatalog,
  priceForPlan,
  tierForPrice,
  toPromotionCodeDto,
} from './billing.logic';
import { BillingRepository } from './billing.repository';
import { STRIPE_CLIENT } from './stripe.client';

const HANDLED_SUBSCRIPTION_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
] as const;

const PAYMENT_METHOD_UPDATE_PURPOSE = 'payment_method_update';

@Injectable()
export class BillingService {
  private readonly config: BillingConfig;

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe | null,
    private readonly repository: BillingRepository,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<BillingConfig>('billing');
  }

  getBillingConfig(): BillingConfigDto {
    this.requireStripe();
    if (!this.config.publishableKey) {
      throw new ServiceUnavailableException(
        'Stripe publishable key is not configured',
      );
    }
    return { publishableKey: this.config.publishableKey };
  }

  async createSubscription(
    userId: string,
    plan: PaidTier,
    promotionCode?: string,
  ): Promise<SubscriptionPaymentDto> {
    const stripe = this.requireStripe();
    const customerId = await this.ensureCustomer(stripe, userId);
    await this.cancelIncompleteSubscriptions(stripe, customerId);
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceForPlan(plan, this.catalog()) }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      discounts: promotionCode
        ? [
            {
              promotion_code: (
                await this.requirePromotionCode(stripe, promotionCode)
              ).id,
            },
          ]
        : undefined,
      metadata: { userId },
      expand: ['latest_invoice.confirmation_secret', 'pending_setup_intent'],
    });
    const setupIntent = subscription.pending_setup_intent;
    if (
      setupIntent &&
      typeof setupIntent === 'object' &&
      setupIntent.client_secret
    ) {
      return {
        clientSecret: setupIntent.client_secret,
        kind: PaymentIntentKind.SETUP,
      };
    }
    const invoice = subscription.latest_invoice;
    const clientSecret =
      invoice && typeof invoice === 'object'
        ? (invoice.confirmation_secret?.client_secret ?? null)
        : null;
    if (!clientSecret) {
      throw new ServiceUnavailableException(
        'Stripe returned no payment client secret',
      );
    }
    return { clientSecret, kind: PaymentIntentKind.PAYMENT };
  }

  async previewPlanChange(
    userId: string,
    plan: PaidTier,
  ): Promise<ChangePlanPreviewDto> {
    const stripe = this.requireStripe();
    const current = await this.requireChangeableSubscription(stripe, userId);
    const item = current.items.data[0];
    const currentTier = tierForPrice(item.price.id, this.catalog());
    if (!currentTier || currentTier === plan) {
      throw new BadRequestException('The subscription is already on this plan');
    }
    const targetPrice = priceForPlan(plan, this.catalog());
    const isUpgrade = plan === SubscriptionTier.UNLIMITED;
    const [preview, price] = await Promise.all([
      stripe.invoices.createPreview({
        subscription: current.id,
        subscription_details: {
          items: [{ id: item.id, price: targetPrice }],
          proration_behavior: isUpgrade ? 'create_prorations' : 'none',
        },
      }),
      stripe.prices.retrieve(targetPrice),
    ]);
    const monthlyAmount = price.unit_amount ?? 0;
    return {
      currentPlan: currentTier as PaidTier,
      targetPlan: plan,
      monthlyAmount,
      prorationAmount: Math.max(0, preview.total - monthlyAmount),
      nextInvoiceTotal: preview.total,
      nextInvoiceDate: item.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
    };
  }

  private async requireChangeableSubscription(
    stripe: Stripe,
    userId: string,
  ): Promise<Stripe.Subscription> {
    const row = await this.repository.findSubscriptionByUserId(userId);
    if (!row?.stripeSubscriptionId) {
      throw new ForbiddenException('No subscription to change for this user');
    }
    const current = await stripe.subscriptions.retrieve(
      row.stripeSubscriptionId,
    );
    if (current.status !== 'active' && current.status !== 'past_due') {
      throw new ForbiddenException('The subscription cannot be changed');
    }
    return current;
  }

  async changeSubscriptionPlan(
    userId: string,
    plan: PaidTier,
  ): Promise<SubscriptionDto> {
    const stripe = this.requireStripe();
    const current = await this.requireChangeableSubscription(stripe, userId);
    const targetPrice = priceForPlan(plan, this.catalog());
    const item = current.items.data[0];
    if (item.price.id !== targetPrice) {
      const isUpgrade = plan === SubscriptionTier.UNLIMITED;
      const updated = await stripe.subscriptions.update(current.id, {
        items: [{ id: item.id, price: targetPrice }],
        proration_behavior: isUpgrade ? 'create_prorations' : 'none',
      });
      await this.applySubscription(updated);
    }
    const fresh = await this.repository.findSubscriptionByUserId(userId);
    if (!fresh) {
      throw new NotFoundException('Subscription not found');
    }
    return toSubscriptionDto(fresh);
  }

  private async cancelIncompleteSubscriptions(
    stripe: Stripe,
    customerId: string,
  ): Promise<void> {
    const incomplete = await stripe.subscriptions.list({
      customer: customerId,
      status: 'incomplete',
      limit: 20,
    });
    await Promise.all(
      incomplete.data.map((subscription) =>
        stripe.subscriptions.cancel(subscription.id),
      ),
    );
  }

  async findPromotionCode(code: string): Promise<PromotionCodeDto> {
    const stripe = this.requireStripe();
    const promotion = await this.lookupPromotionCode(stripe, code);
    if (!promotion) {
      throw new NotFoundException('Unknown or expired promotion code');
    }
    return toPromotionCodeDto(promotion.code, this.couponOf(promotion));
  }

  private async requirePromotionCode(
    stripe: Stripe,
    code: string,
  ): Promise<Stripe.PromotionCode> {
    const promotion = await this.lookupPromotionCode(stripe, code);
    if (!promotion) {
      throw new BadRequestException('Unknown or expired promotion code');
    }
    return promotion;
  }

  private async lookupPromotionCode(
    stripe: Stripe,
    code: string,
  ): Promise<Stripe.PromotionCode | null> {
    const list = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
      expand: ['data.promotion.coupon'],
    });
    const promotion = list.data[0];
    if (!promotion || !promotion.active) {
      return null;
    }
    const coupon = promotion.promotion.coupon;
    return typeof coupon === 'object' && coupon !== null && coupon.valid
      ? promotion
      : null;
  }

  private couponOf(promotion: Stripe.PromotionCode): Stripe.Coupon {
    return promotion.promotion.coupon as Stripe.Coupon;
  }

  async cancelSubscription(userId: string): Promise<SubscriptionDto> {
    return this.updateCancelAtPeriodEnd(userId, true);
  }

  async resumeSubscription(userId: string): Promise<SubscriptionDto> {
    return this.updateCancelAtPeriodEnd(userId, false);
  }

  private async updateCancelAtPeriodEnd(
    userId: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<SubscriptionDto> {
    const stripe = this.requireStripe();
    const row = await this.repository.findSubscriptionByUserId(userId);
    if (!row?.stripeSubscriptionId) {
      throw new ForbiddenException('No subscription for this user');
    }
    const updated = await stripe.subscriptions.update(
      row.stripeSubscriptionId,
      { cancel_at_period_end: cancelAtPeriodEnd },
    );
    await this.applySubscription(updated);
    const fresh = await this.repository.findSubscriptionByUserId(userId);
    if (!fresh) {
      throw new NotFoundException('Subscription not found');
    }
    return toSubscriptionDto(fresh);
  }

  async createPaymentMethodSetup(
    userId: string,
  ): Promise<SubscriptionPaymentDto> {
    const stripe = this.requireStripe();
    const customerId = await this.ensureCustomer(stripe, userId);
    const intent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      metadata: { userId, purpose: PAYMENT_METHOD_UPDATE_PURPOSE },
    });
    if (!intent.client_secret) {
      throw new ServiceUnavailableException(
        'Stripe returned no setup client secret',
      );
    }
    return {
      clientSecret: intent.client_secret,
      kind: PaymentIntentKind.SETUP,
    };
  }

  async handleWebhook(
    payload: Buffer | undefined,
    signature: string | undefined,
  ): Promise<void> {
    const stripe = this.requireStripe();
    if (!payload || !signature || !this.config.webhookSecret) {
      throw new BadRequestException('Missing webhook signature material');
    }
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }
    if (!(await this.repository.registerEvent(event.id))) {
      return;
    }
    if (event.type === 'setup_intent.succeeded') {
      await this.applyPaymentMethodUpdate(stripe, event.data.object);
      return;
    }
    if (
      (HANDLED_SUBSCRIPTION_EVENTS as readonly string[]).includes(event.type)
    ) {
      await this.applySubscription(event.data.object as Stripe.Subscription);
    }
  }

  private async applyPaymentMethodUpdate(
    stripe: Stripe,
    setupIntent: Stripe.SetupIntent,
  ): Promise<void> {
    if (
      setupIntent.metadata?.['purpose'] !== PAYMENT_METHOD_UPDATE_PURPOSE ||
      !setupIntent.customer ||
      !setupIntent.payment_method
    ) {
      return;
    }
    const customerId =
      typeof setupIntent.customer === 'string'
        ? setupIntent.customer
        : setupIntent.customer.id;
    const paymentMethodId =
      typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method.id;
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    const userId = await this.repository.findUserIdByStripeCustomerId(
      customerId,
    );
    if (!userId) {
      return;
    }
    const row = await this.repository.findSubscriptionByUserId(userId);
    if (row?.stripeSubscriptionId && row.status !== 'CANCELED') {
      await stripe.subscriptions.update(row.stripeSubscriptionId, {
        default_payment_method: paymentMethodId,
      });
    }
  }

  private async applySubscription(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;
    const userId =
      subscription.metadata?.['userId'] ??
      (await this.repository.findUserIdByStripeCustomerId(customerId));
    if (!userId) {
      return;
    }
    const item = subscription.items.data[0];
    const tier = item ? tierForPrice(item.price.id, this.catalog()) : null;
    if (!tier) {
      return;
    }
    await this.repository.upsertSubscription(userId, {
      stripeSubscriptionId: subscription.id,
      tier,
      status: mapStripeSubscriptionStatus(subscription.status),
      currentPeriodEnd: item.current_period_end
        ? new Date(item.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  }

  private async ensureCustomer(
    stripe: Stripe,
    userId: string,
  ): Promise<string> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: { userId },
    });
    await this.repository.saveStripeCustomerId(userId, customer.id);
    return customer.id;
  }

  private catalog(): PriceCatalog {
    if (!this.config.priceEssential || !this.config.priceUnlimited) {
      throw new ServiceUnavailableException('Stripe prices are not configured');
    }
    return {
      priceEssential: this.config.priceEssential,
      priceUnlimited: this.config.priceUnlimited,
    };
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Billing is disabled in this environment',
      );
    }
    return this.stripe;
  }
}
