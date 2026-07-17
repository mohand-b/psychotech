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
  BillingRedirectDto,
  PaidTier,
  PaymentIntentKind,
  PromotionCodeDto,
  SubscriptionPaymentDto,
} from '@psychotech/shared';
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

@Injectable()
export class BillingService {
  private readonly config: BillingConfig;
  private portalConfigurationId: string | null = null;

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

  async createPortalSession(
    userId: string,
    origin: string,
  ): Promise<BillingRedirectDto> {
    const stripe = this.requireStripe();
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.stripeCustomerId) {
      throw new ForbiddenException('No billing account for this user');
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      configuration: await this.ensurePortalConfiguration(stripe),
      return_url: `${origin}/abonnements`,
    });
    return { url: session.url };
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
    if (
      (HANDLED_SUBSCRIPTION_EVENTS as readonly string[]).includes(event.type)
    ) {
      await this.applySubscription(event.data.object as Stripe.Subscription);
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

  private async ensurePortalConfiguration(stripe: Stripe): Promise<string> {
    if (this.portalConfigurationId) {
      return this.portalConfigurationId;
    }
    const existing = await stripe.billingPortal.configurations.list({
      active: true,
      limit: 1,
    });
    if (existing.data.length > 0) {
      this.portalConfigurationId = existing.data[0].id;
      return this.portalConfigurationId;
    }
    const catalog = this.catalog();
    const [essential, unlimited] = await Promise.all([
      stripe.prices.retrieve(catalog.priceEssential),
      stripe.prices.retrieve(catalog.priceUnlimited),
    ]);
    const created = await stripe.billingPortal.configurations.create({
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: 'at_period_end' },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price'],
          products: [
            {
              product: this.productId(essential),
              prices: [essential.id],
            },
            {
              product: this.productId(unlimited),
              prices: [unlimited.id],
            },
          ],
        },
      },
    });
    this.portalConfigurationId = created.id;
    return this.portalConfigurationId;
  }

  private productId(price: Stripe.Price): string {
    return typeof price.product === 'string' ? price.product : price.product.id;
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
